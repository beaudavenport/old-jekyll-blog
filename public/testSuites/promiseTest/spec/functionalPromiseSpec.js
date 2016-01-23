describe('MyPromise Inflection points', function() {
  describe('1.', function() {
    it('When a promise is instantiated by a user, it executes', function() {
      var resolver = jasmine.createSpy();

      var myPromise = new MyPromise(resolver);

      //resolver should have been called with 2 functions.
      expect(resolver).toHaveBeenCalledWith(jasmine.any(Function), jasmine.any(Function));
    });
  });

  describe('2.', function() {
    it('.then method calls add a "queue item", and return a new internal promise, exposing its own .then method', function() {
      var successCallback = function() {};
      var failureCallback = function() {};
      var successCallback2 = function() {};
      var failureCallback2 = function() {};

      var myPromise = new MyPromise(function() {});
      var newPromise = myPromise.then(successCallback, failureCallback);
      var newPromise2 = newPromise.then(successCallback2, failureCallback2);

      //the original promise should have 1 queue item with our first callbacks.
      var firstQueueItem = myPromise.queue[0];
      expect(firstQueueItem.promise).toBe(newPromise);
      expect(firstQueueItem.successCallback).toBe(successCallback);
      expect(firstQueueItem.failureCallback).toBe(failureCallback);

      //the new internal promise returned from the .then method should have its own queue item.
      var secondQueueItem = newPromise.queue[0];
      expect(secondQueueItem.promise).toBe(newPromise2);
      expect(secondQueueItem.successCallback).toBe(successCallback2);
      expect(secondQueueItem.failureCallback).toBe(failureCallback2);
    });
  });

  describe('3.', function() {
    var myPromise;
    var newPromise;
    var firstValue = 10;
    var secondValue = 20;
    var resolver = jasmine.createSpy().and.callFake(function(resolve, reject) {
      // simulate a non-blocking wait.
      setTimeout(function() {
        resolve(firstValue);
      }, 10);
    });
    var successCallback = jasmine.createSpy().and.callFake(function() {
      return secondValue;
    });

    beforeEach(function(done) {
      myPromise = new MyPromise(resolver);
      newPromise = myPromise.then(successCallback);
      newPromise.then(function() {
        //successCallback will have fired at this point, so we tell jasmine
        //that we're ready for making assertions.
        done();
      });
    });

    it('If a queue item contains a success callback function, that function executes when the promise in which it lives resolves.', function() {
      expect(myPromise.outcomeValue).toBe(firstValue);
      expect(myPromise.queue[0].successCallback).toBe(successCallback);
      expect(successCallback).toHaveBeenCalledWith(firstValue);
      expect(newPromise.outcomeValue).toBe(secondValue);
    });
  });

  describe('4.', function() {
    var myPromise;
    var newPromise;
    var thirdPromise;
    var firstError = "Server responded with an error.";
    var secondError = "non-specific failure";
    var resolver = jasmine.createSpy().and.callFake(function(resolve, reject) {
      // simulate a non-blocking wait.
      setTimeout(function() {
        reject(firstError);
      }, 10);
    });
    var failureCallback = jasmine.createSpy().and.callFake(function() {
      throw new Error(secondError);
    });
    var failureCallback2 = jasmine.createSpy();

    beforeEach(function(done) {
      myPromise = new MyPromise(resolver);

      //spy on myPromise to verify "catch" functionality
      spyOn(myPromise, 'then').and.callThrough();

      newPromise = myPromise.then(null, failureCallback);
      thirdPromise = newPromise.catch(failureCallback2);
      thirdPromise.then(function() {
        //failureCallbacks will have fired at this point, so we tell jasmine
        //that we're ready for making assertions.
        done();
      });
    });

    it('If a queue item contains a failure callback function, that function executes when the promise in which it lives is rejected.', function() {
      expect(myPromise.outcomeValue).toBe(firstError);
      expect(myPromise.queue[0].failureCallback).toBe(failureCallback);
      expect(failureCallback).toHaveBeenCalledWith(firstError);
      //newPromise will have an actual error set to the outcome value
      expect(newPromise.outcomeValue.toString()).toBe('Error: ' + secondError);
      expect(failureCallback2).toHaveBeenCalledWith(new Error(secondError));
    });
  });

  describe('5.', function() {
    var myPromise;
    var newPromise;
    var thirdPromise;
    var firstValue = 10;
    var secondValue = 15;
    var additionValue = 20;
    var firstResolver = jasmine.createSpy().and.callFake(function(resolve, reject) {
      // simulate a non-blocking wait.
      setTimeout(function() {
        resolve(firstValue);
      }, 10);
    });
    var successCallback = jasmine.createSpy().and.callFake(function(value) {
      return new MyPromise(function(resolve, reject) {
        // simulate a non-blocking wait.
        setTimeout(function() {
          resolve(secondValue);
        }, 10);
      });
    });
    var successCallback2 = jasmine.createSpy().and.callFake(function(value) {
      return new MyPromise(function(resolve, reject) {
        // simulate a non-blocking wait.
        setTimeout(function() {
          //modify the value from our first promise resolution and pass along
          resolve(value + additionValue);
        }, 10);
      });
    });

    beforeEach(function(done) {
      myPromise = new MyPromise(firstResolver);
      newPromise = myPromise.then(successCallback);
      thirdPromise = newPromise.then(successCallback2);
      thirdPromise.then(function() {
        //successCallback will have fired at this point, so we tell jasmine
        //that we're ready for making assertions.
        done();
      });
    });

    it('If a success callback returns a new instance of a promise, the internal promise resolves from the new promise', function() {
      expect(myPromise.queue[0].successCallback).toBe(successCallback);
      expect(newPromise.outcomeValue).toBe(secondValue);
    });

    it('The result value of the promise instance is available for the next promise', function() {
      expect(newPromise.queue[0].successCallback).toBe(successCallback2);
      expect(thirdPromise.outcomeValue).toBe(secondValue + additionValue);
    });
  });
});