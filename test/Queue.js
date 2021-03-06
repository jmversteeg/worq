'use strict';

require('./support/bootstrap');

const _     = require('lodash');
const Queue = require('../');
const sinon = require('sinon');
const delay = require('delay');

const d     = (fn) => delay(10).then(fn);
const error = (msg) => {
    throw new Error(msg);
};

describe('Queue', () => {

    describe('run', () => {

        let queue;

        beforeEach(() => {
            queue = new Queue({concurrency: 1});
        });

        it('should return a promise for the completion of the jobs', () => {
            let spy1 = sinon.spy();
            return queue.run([
                () => d(() => spy1())
            ]).then(() => {
                spy1.should.have.been.called;
            });
        });

        it('should run the jobs one by one if the concurrency is set to 1', () => {
            let spy1 = sinon.spy();
            let spy2 = sinon.spy();
            return queue.run([
                () => d(() => spy1()),
                () => spy2()
            ]).then(() => {
                spy1.should.have.been.calledBefore(spy2);
            });
        });

        it('should fulfill with an array containing the fulfillment values', () => {
            return queue.run([
                () => d(() => 'foo'),
                () => d(() => 'bar')
            ]).should.eventually.eql(['foo', 'bar']);
        });

        it('should accept a mixture of regular and promise-returning functions', () => {
            return queue.run([
                () => d(() => 'foo'),
                () => 'bar'
            ]).should.eventually.eql(['foo', 'bar']);
        });

        it('should reject with the error if one of the jobs is rejected', () => {
            return queue.run([
                () => d(() => 'foo'),
                () => d(() => error('shoo'))
            ]).should.be.rejectedWith('shoo');
        });

        it('should reject with the error if one is thrown directly', () => {
            return queue.run([
                () => d(() => 'foo'),
                () => error('shoo')
            ]).should.be.rejectedWith('shoo');
        });

        it('should not run the remaining jobs if one of the jobs rejects', () => {
            let spy = sinon.spy();
            return queue.run([
                () => d(error),
                () => d(() => spy())
            ]).then(() => {
                throw new Error('Should not fulfill');
            }, () => {
                spy.should.not.have.been.called;
            });
        });

        it('should run the jobs in concurrency', () => {
            queue    = new Queue({concurrency: 3});
            let time = Date.now();
            return queue.run(_.times(9, () => () => delay(50))).then(() => {
                let passed = Date.now() - time;
                passed.should.be.below(175);
                passed.should.be.above(125);
            });
        });
    });

    describe('static run', () => {
        it('should instantiate a new Queue instance and call the run function with the given jobs', () => {
            sinon.spy(Queue.prototype, 'run');
            let jobs = [];
            Queue.run(jobs);
            Queue.prototype.run.should.have.been.calledWith(jobs);
            Queue.prototype.run.restore();
        });
    });
});