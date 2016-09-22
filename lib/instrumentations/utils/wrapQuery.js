var microtime = require('../../optionalDependencies/microtime')
var debug = require('debug')('risingstack/trace:agent:instrumentations')
var format = require('util').format

function wrapQuery (original, args, agent, params) {
  var _params = params || {}
  var collector = agent.tracer.collector
  var externalEdgeMetrics = agent.externalEdgeMetrics
  var returnsPromise = _params.returnsPromise || false
  var disableCallback = _params.disableCallback

  var reportSend = function () {
    var briefcase = agent.storage.get('tracer.briefcase')
    var communication = briefcase && briefcase.communication

    var action = _params.method == null ? 'unknown' : _params.method
    var resource = _params.url == null ? 'unknown' : _params.url

    var cs = collector.clientSend({
      protocol: _params.protocol,
      action: action,
      resource: resource,
      host: _params.host,
      data: _params.protocolSpecific,
      severity: collector.defaultSeverity
    }, {
      communication: communication
    })

    debug('#wrapQuery', format('CS(%s) [%s %s %s %s]',
      cs.briefcase.csCtx.communicationId, _params.protocol,
      action, resource, _params.host))

    return cs
  }

  var reportReceive = function (err, cs) {
    var severity = err
      ? collector.mustCollectSeverity
      : collector.defaultSeverity

    var status = err ? 'bad' : 'ok'

    debug('#wrapQuery', format('CR(%s) [%s %s] [severity: %s]',
      cs.briefcase.csCtx.communicationId, _params.protocol, status, severity))

    collector.clientRecv({
      protocol: _params.protocol,
      status: err ? 'bad' : 'ok'
    }, {
      severity: severity
    }, cs.briefcase)

    externalEdgeMetrics.report({
      targetHost: _params.host,
      protocol: _params.protocol,
      status: err
        ? externalEdgeMetrics.EDGE_STATUS.NOT_OK
        : externalEdgeMetrics.EDGE_STATUS.OK,
      responseTime: microtime.now() - cs.duffelBag.timestamp
    })
  }

  var cs

  if (returnsPromise) {
    cs = reportSend()
    var originalPromise = original.apply(this, args)
    return originalPromise.then(
      function (v) { reportReceive(null, cs); return v },
      function (err) { reportReceive(err, cs); return err }
    )
  } else { // uses callback
    var wrappedCallback = function (original) {
      return function (err) {
        reportReceive(err, cs)
        return original.apply(this, arguments)
      }
    }
    var last = args[args.length - 1]
    if (last && typeof last === 'function') {
      args[args.length - 1] = wrappedCallback(last)
    } else if (Array.isArray(last) && typeof last[last.length - 1] === 'function') {
      var lastOfLast = last.length - 1
      args[args.length - 1][lastOfLast] = wrappedCallback(last[lastOfLast])
    } else if (!disableCallback) {
      args.push(wrappedCallback(function () { }))
    }
    cs = reportSend()
    return original.apply(this, args)
  }
}

module.exports = wrapQuery
