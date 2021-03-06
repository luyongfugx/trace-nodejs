var expect = require('chai').expect
var wrapQuery = require('./wrapQuery')
var consts = require('../../consts')

function fakeAgent (sandbox) {
  return {
    generateCommId: function () { return 'fakeChildCommId' },
    getMicrotime: function () { return 42 },
    getRequestId: function () { return 'fakeRequestId' },
    clientSend: sandbox.spy(),
    clientReceive: sandbox.spy(),
    CLIENT_SEND: 'fakeSend'
  }
}

describe('wrapQuery', function () {
  describe('callback api', function () {
    it('should notify agent on send', function () {
      var query = this.sandbox.spy()
      var agent = fakeAgent(this.sandbox)
      wrapQuery(query, [], agent, {
        protocol: 'protocol',
        url: 'fakeUrl',
        host: 'fakeHost',
        parameter: 'fakeParam',
        method: 'fakeMethod',
        continuationMethod: 'callback'
      })
      expect(agent.clientSend).to.have.been.calledWith({
        protocol: 'protocol',
        host: 'fakeHost',
        requestId: 'fakeRequestId',
        method: 'fakeMethod',
        childCommId: 'fakeChildCommId',
        time: 42,
        type: 'fakeSend',
        url: 'fakeUrl'
      })
    })
    it('should call the original', function () {
      var query = this.sandbox.spy()
      var agent = fakeAgent(this.sandbox)
      wrapQuery(query, [], agent, {
        continuationMethod: 'callback'
      })
      expect(query).to.have.been.calledWith()
    })

    it('should pass the callback', function () {
      var query = function (cb) {
        expect(cb).to.be.a('function')
      }
      var cb = this.sandbox.spy()
      var agent = fakeAgent(this.sandbox)
      wrapQuery(query, [cb], agent, {
        continuationMethod: 'callback'
      })
    })

    it('should pass the callback if it\'s in an array', function () {
      var query = function (_, cb) {
        expect(cb[0]).to.be.a('function')
      }
      var cb = this.sandbox.spy()
      var agent = fakeAgent(this.sandbox)
      wrapQuery(query, ['otherArgument', [cb]], agent)
    })

    it('should shove a callback', function () {
      var query = function (cb) {
        expect(cb).to.be.a('function')
      }
      var agent = fakeAgent(this.sandbox)
      wrapQuery(query, [], agent, {
        continuationMethod: 'callback'
      })
    })

    it('should notify agent on receive', function () {
      var query = function (cb) { cb() }
      var agent = fakeAgent(this.sandbox)
      wrapQuery(query, [], agent, {
        url: 'fakeUrl',
        host: 'fakeHost',
        parameter: 'fakeParam',
        method: 'fakeMethod',
        protocol: 'fakeProtocol',
        continuationMethod: 'callback'
      })
      expect(agent.clientReceive).to.have.been.calledWith({
        host: 'fakeHost',
        requestId: 'fakeRequestId',
        method: 'fakeMethod',
        mustCollect: undefined,
        protocol: 'fakeProtocol',
        responseTime: 0,
        childCommId: 'fakeChildCommId',
        status: 0,
        statusDescription: undefined,
        time: 42,
        url: 'fakeUrl'
      })
    })

    it('should signal an error', function () {
      var query = function (cb) { cb(new Error('damn')) }
      var agent = fakeAgent(this.sandbox)
      wrapQuery(query, [], agent, {
        continuationMethod: 'callback'
      })
      expect(agent.clientReceive.args[0][0].mustCollect).to.eql(consts.MUST_COLLECT.ERROR)
    })

    it('should use parseError when given', function () {
      var err = new Error('damn')
      var query = function (cb) { cb(err) }
      var agent = fakeAgent(this.sandbox)
      var parseError = this.sandbox.spy()
      wrapQuery(query, [], agent, {
        parseError: parseError,
        continuationMethod: 'callback'
      })
      expect(parseError).to.have.been.calledWith(err)
    })
  })

  describe('promise api', function () {
    it('should notify agent on send', function () {
      var query = this.sandbox.spy(function () {
        return Promise.resolve()
      })
      var agent = fakeAgent(this.sandbox)
      wrapQuery(query, [], agent, {
        protocol: 'protocol',
        url: 'fakeUrl',
        host: 'fakeHost',
        parameter: 'fakeParam',
        method: 'fakeMethod',
        continuationMethod: 'promise'
      })
      expect(agent.clientSend).to.have.been.calledWith({
        protocol: 'protocol',
        host: 'fakeHost',
        requestId: 'fakeRequestId',
        method: 'fakeMethod',
        childCommId: 'fakeChildCommId',
        time: 42,
        type: 'fakeSend',
        url: 'fakeUrl'
      })
    })

    it('should call the original', function () {
      var query = this.sandbox.spy(function () {
        return Promise.resolve()
      })
      var agent = fakeAgent(this.sandbox)
      wrapQuery(query, [], agent, {
        continuationMethod: 'promise'
      })
      expect(query).to.have.been.called
    })

    it('should return a promise', function () {
      var query = this.sandbox.spy(function () {
        return Promise.resolve()
      })
      var agent = fakeAgent(this.sandbox)
      var returnValue = wrapQuery(query, [], agent, {
        continuationMethod: 'promise'
      })
      expect(returnValue).to.be.a('promise')
    })

    it('should not shove a callback', function () {
      var query = function () {
        var args = Array.prototype.slice.call(arguments)
        var callbacks = args.filter(function (arg) { return typeof arg === 'function' })
        expect(callbacks).to.have.length(0)
        return Promise.resolve()
      }
      var agent = fakeAgent(this.sandbox)
      wrapQuery(query, [], agent, {
        continuationMethod: 'promise'
      })
    })

    it('should notify agent on receive', function (done) {
      var query = function () {
        return Promise.resolve()
      }
      var agent = fakeAgent(this.sandbox)
      wrapQuery(query, [], agent, {
        url: 'fakeUrl',
        host: 'fakeHost',
        parameter: 'fakeParam',
        method: 'fakeMethod',
        protocol: 'fakeProtocol',
        continuationMethod: 'promise'
      })
        .then(function () {
          expect(agent.clientReceive).to.have.been.calledWith({
            host: 'fakeHost',
            requestId: 'fakeRequestId',
            method: 'fakeMethod',
            mustCollect: undefined,
            protocol: 'fakeProtocol',
            responseTime: 0,
            childCommId: 'fakeChildCommId',
            status: 0,
            statusDescription: undefined,
            time: 42,
            url: 'fakeUrl'
          })
          done()
        })
    })

    it('should signal an error', function (done) {
      var query = function () {
        return Promise.reject(new Error())
      }
      var agent = fakeAgent(this.sandbox)
      wrapQuery(query, [], agent, {
        continuationMethod: 'promise'
      })
        .catch(function () {
          expect(agent.clientReceive.args[0][0].mustCollect).to.eql(consts.MUST_COLLECT.ERROR)
          done()
        })
    })

    it('should use parseError when given', function (done) {
      var err = new Error('damn')
      var query = function () {
        return Promise.reject(new Error())
      }
      var agent = fakeAgent(this.sandbox)
      var parseError = this.sandbox.spy()
      wrapQuery(query, [], agent, {
        parseError: parseError,
        continuationMethod: 'promise'
      })
        .catch(function () {
          expect(parseError).to.have.been.calledWith(err)
          done()
        })
    })
  })

  describe('stream api', function () {
    // create our own readable stream
    var Readable = require('stream').Readable

    it('should notify agent on send', function () {
      var query = this.sandbox.spy(function () {
        return new Readable()
      })

      var agent = fakeAgent(this.sandbox)
      wrapQuery(query, [], agent, {
        protocol: 'protocol',
        url: 'fakeUrl',
        host: 'fakeHost',
        parameter: 'fakeParam',
        method: 'fakeMethod',
        continuationMethod: 'readStream'
      })
      expect(agent.clientSend).to.have.been.calledWith({
        protocol: 'protocol',
        host: 'fakeHost',
        requestId: 'fakeRequestId',
        method: 'fakeMethod',
        childCommId: 'fakeChildCommId',
        time: 42,
        type: 'fakeSend',
        url: 'fakeUrl'
      })
    })

    it('should call the original', function () {
      var query = this.sandbox.spy(function () {
        return new Readable()
      })
      var agent = fakeAgent(this.sandbox)
      wrapQuery(query, [], agent, {
        continuationMethod: 'readStream'
      })
      expect(query).to.have.been.called
    })

    it('should return the original readable stream', function () {
      var readStream = new Readable()
      var query = this.sandbox.spy(function () {
        return readStream
      })
      var agent = fakeAgent(this.sandbox)
      var returnValue = wrapQuery(query, [], agent, {
        continuationMethod: 'readStream'
      })
      expect(returnValue).to.be.eql(readStream)
    })

    it('should not shove a callback', function () {
      var query = function () {
        var args = Array.prototype.slice.call(arguments)
        var callbacks = args.filter(function (arg) { return typeof arg === 'function' })
        expect(callbacks).to.have.length(0)
        return new Readable()
      }
      var agent = fakeAgent(this.sandbox)
      wrapQuery(query, [], agent, {
        continuationMethod: 'readStream'
      })
    })

    it('should notify agent on receive', function (done) {
      var query = function () {
        return new Readable()
      }
      var agent = fakeAgent(this.sandbox)
      var readStream = wrapQuery(query, [], agent, {
        url: 'fakeUrl',
        host: 'fakeHost',
        parameter: 'fakeParam',
        method: 'fakeMethod',
        protocol: 'fakeProtocol',
        continuationMethod: 'readStream'
      })

      readStream.resume()

      readStream.on('end', function () {
        expect(agent.clientReceive).to.have.been.calledWith({
          host: 'fakeHost',
          requestId: 'fakeRequestId',
          method: 'fakeMethod',
          mustCollect: undefined,
          protocol: 'fakeProtocol',
          responseTime: 0,
          childCommId: 'fakeChildCommId',
          status: 0,
          statusDescription: undefined,
          time: 42,
          url: 'fakeUrl'
        })
        done()
      })

      // end the read stream by pushing null to it
      readStream.push(null)
    })

    it('should let data through', function (done) {
      var testData = 'data'
      var query = function () {
        return new Readable()
      }
      var agent = fakeAgent(this.sandbox)
      var readStream = wrapQuery(query, [], agent, {
        url: 'fakeUrl',
        host: 'fakeHost',
        parameter: 'fakeParam',
        method: 'fakeMethod',
        protocol: 'fakeProtocol',
        continuationMethod: 'readStream'
      })

      readStream.on('data', function (data) {
        expect(data.toString('utf-8')).to.eql(testData)
        done()
      })

      // end the read stream by pushing null to it
      readStream.push(testData)
      readStream.push(null)
    })

    it('should signal an error', function () {
      var query = function () {
        return new Readable()
      }
      var agent = fakeAgent(this.sandbox)
      var readStream = wrapQuery(query, [], agent, {
        continuationMethod: 'readStream'
      })

      readStream.resume()

      readStream.on('error', function () {
        expect(agent.clientReceive.args[0][0].mustCollect).to.eql(consts.MUST_COLLECT.ERROR)
      })

      readStream.emit('error', new Error('damn'))
    })

    it('should use parseError when given', function (done) {
      var err = new Error('damn')
      var query = function () {
        return new Readable()
      }
      var agent = fakeAgent(this.sandbox)
      var parseError = this.sandbox.spy()
      var readStream = wrapQuery(query, [], agent, {
        parseError: parseError,
        continuationMethod: 'readStream'
      })
      readStream.on('error', function () {
        expect(parseError).to.have.been.calledWith(err)
        done()
      })

      readStream.emit('error', err)
    })

    it('should throw an error if no error listener is set', function () {
      var err = new Error('damn')
      var query = function () {
        return new Readable()
      }
      var agent = fakeAgent(this.sandbox)
      var parseError = this.sandbox.spy()

      var readStream = wrapQuery(query, [], agent, {
        parseError: parseError,
        continuationMethod: 'readStream'
      })

      try {
        readStream.emit('error', err)
      } catch (ex) {
        expect(ex).to.eql(err)
      }
    })
  })
})
