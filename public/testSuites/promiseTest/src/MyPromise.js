/*
 ** Adapted from https://github.com/calvinmetcalf/lie
 */
var INTERNAL = function() {};
var promiseCount = 1;

var MyPromise = function(promiseDeclaration) {
  this.name = promiseCount;
  console.log("new promise created! - " + this.name);
  promiseCount++
  this.queue = [];
  this.state = "Pending";
  this.outcomeValue = null;

  //////////// INFLECTION POINT: when a promise is instantiated by a user, it exectutes.
  if (promiseDeclaration !== INTERNAL) {
    ResolveThenable(this, promiseDeclaration);
  }
};

MyPromise.prototype.then = function(successFunction, failureFunction) {
  ////////////// INFLECTION POINT: .then method calls return a new promise instance.
  var promise = new MyPromise(INTERNAL);
  console.log("the state of this promise is: " + this.state);
  this.queue.push(new QueueItem(promise, successFunction, failureFunction));

  return promise;
};

MyPromise.prototype.catch = function(failureFunction) {
  return this.then(null, failureFunction);
};

var QueueItem = function(promise, successCallback, failureCallback) {
  this.promise = promise;

  if (typeof successCallback === 'function') {
    this.successCallback = successCallback;
    this.callFulfilled = this.callFulfilledWithCallback;
  }
  if (typeof failureCallback === 'function') {
    this.failureCallback = failureCallback;
    this.callRejected = this.callRejectedWithCallback;
  }
};

QueueItem.prototype.callFulfilled = function(value) {
  PromiseResolve(this.promise, value);
}

QueueItem.prototype.callRejected = function(value) {
  PromiseReject(this.promise, value);
}

QueueItem.prototype.callFulfilledWithCallback = function(value) {
  executeCallbackAndResolve(this.promise, this.successCallback, value);
}

QueueItem.prototype.callRejectedWithCallback = function(value) {
  executeCallbackAndResolve(this.promise, this.failureCallback, value);
}

///////////////// INFLECTION POINT: if a .then method receives a callback, that function is called
///////////////// with the value of the resolved promise, when the promise resolves, or error
///////////////// when it rejects.

var executeCallbackAndResolve = function(promise, func, value) {
  var returnValue;
  try {
    returnValue = func(value);
  } catch (e) {
    // errors get swallowed!
    return PromiseReject(promise, e);
  }
  PromiseResolve(promise, returnValue);
}

var ResolveThenable = function(self, definitelyAThenFunction) {
  var onErrorCallback = function(value) {
    PromiseReject(self, value);
  }
  var onSuccessCallback = function(value) {
    PromiseResolve(self, value);
  }

  try {
    definitelyAThenFunction(onSuccessCallback, onErrorCallback);
  } catch (e) {
    onErrorCallback(e);
  }
}

var PromiseResolve = function(self, value) {
  ////////////////// INFLECTION POINT: we check if the return value is itself a promise
  try {
    var possiblyThenable = CheckIfThenable(value);
  } catch (e) {
    return PromiseReject(self, e);
  }

  if (possiblyThenable) {
    ResolveThenable(self, possiblyThenable);
  } else {
    self.state = "Fulfilled";
    self.outcomeValue = value;
    self.queue.forEach(function(queueItem) {
      queueItem.callFulfilled(value);
    });
  }

  return self;
};

var PromiseReject = function(self, error) {
  self.state = "Rejected";
  self.outcomeValue = error;
  self.queue.forEach(function(queueItem) {
    queueItem.callRejected(error);
  });

  return self;
};

var CheckIfThenable = function(possiblyThenableObject) {
  // if possiblyThenableObject exists, first argument is "truthy" and evaluates to true,
  // then second argument is evaluated, tried to turn into a bool,
  // can't be, so is returned as is.
  var then = possiblyThenableObject && possiblyThenableObject.then;
  if (typeof possiblyThenableObject == 'object' && typeof then == 'function') {
    return function() {
      // return a new anonymous function with possiblyThenableObject locked-in as context
      then.apply(possiblyThenableObject, arguments);
    }
  }
};