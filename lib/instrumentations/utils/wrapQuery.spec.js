var expect = require('chai').expect
var wrapQuery = require('./wrapQuery')
var ExternalEdgeMetrics = require('../../agent/metrics/externalEdge')
var microtime = require('../../optionalDependencies/microtime')

describe('wrapQuery', function () {
  var agent
  var clientSendResult

  beforeEach(function () {
    clientSendResult = {
      duffelBag: {
        timestamp: 5
      },
      briefcase: {
        communication: {
          id: 'parent-id',
          transactionId: 'tr-id'
        },
        csCtx: {
          communicationId: 'child-id',
          transactionId: 'tr-id'
        }
      }
    }
    agent = {
      tracer: {
        collector: {
          clientSend: this.sandbox.stub().returns(clientSendResult),
          clientRecv: this.sandbox.stub().returns({}),
          mustCollectSeverity: 9
        }
      },
      storage: {
        get: this.sandbox.stub().returns({
          communication: {}
        })
      },
      externalEdgeMetrics: {
        EDGE_STATUS: ExternalEdgeMetrics.prototype.EDGE_STATUS,
        report: this.sandbox.spy()
      }
    }
  })

  it('should call tracer.collector.clientSend on send', function () {
    var query = this.sandbox.spy()
    wrapQuery(query, [], agent, {
      protocol: 'protocol',
      url: 'fakeUrl',
      host: 'fakeHost',
      method: 'fakeMethod'
    })
    expect(agent.tracer.collector.clientSend).to.have.been.calledWith({
      action: 'fakeMethod',
      data: undefined,
      host: 'fakeHost',
      protocol: 'protocol',
      resource: 'fakeUrl'
    }, {
      communication: {},
      severity: undefined
    })
  })
  it('should call the original', function () {
    var query = this.sandbox.spy()
    wrapQuery(query, [], agent)
    expect(query).to.have.been.calledWith()
  })

  it('should pass the callback', function () {
    var query = function (cb) {
      expect(cb).to.be.a('function')
    }
    var cb = this.sandbox.spy()
    wrapQuery(query, [cb], agent)
  })

  it('should pass the callback if it\'s in an array', function () {
    var query = function (_, cb) {
      expect(cb[0]).to.be.a('function')
    }
    var cb = this.sandbox.spy()
    wrapQuery(query, ['otherArgument', [cb]], agent)
  })

  it('should shove a callback', function () {
    var query = function (cb) {
      expect(cb).to.be.a('function')
    }
    wrapQuery(query, [], agent)
  })

  it('should call tracer.collector.clientRecv on receive', function () {
    var query = function (cb) { cb() }
    wrapQuery(query, [], agent, {
      url: 'fakeUrl',
      host: 'fakeHost',
      parameter: 'fakeParam',
      method: 'fakeMethod',
      protocol: 'fakeProtocol'
    })
    expect(agent.tracer.collector.clientRecv).to.have.been.calledWith({
      protocol: 'fakeProtocol',
      status: 'ok'
    }, {
      severity: undefined
    }, clientSendResult.briefcase)
  })

  it('should set mustCollect severity on error', function () {
    var query = function (cb) { cb(new Error('damn')) }
    wrapQuery(query, [], agent)
    expect(agent.tracer.collector.clientRecv.args[0][1].severity)
      .to.eql(agent.tracer.collector.mustCollectSeverity)
  })

  it('should report external edge', function () {
    this.sandbox.stub(microtime, 'now').returns(5)
    var query = function (cb) { cb(new Error(null)) }
    wrapQuery(query, [], agent, {
      protocol: 'mongodb',
      host: 'target'
    })
    expect(agent.externalEdgeMetrics.report).to.be.calledWith({
      protocol: 'mongodb',
      responseTime: 0,
      status: 1,
      targetHost: 'target'
    })
  })
})
