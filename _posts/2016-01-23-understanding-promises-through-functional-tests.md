---
layout: post
title: Understanding Promises through Functional Tests
---

Promises are a topic of great interest and great consternation amongst developers.
The headaches that promises can cause aren't because they're completely misunderstood. Most developers who work with promises __do__ have an understanding of them. I think the biggest problem with promises is that they don't require a complete understanding to use their basic features. When working with a promise-based API, you can often
get the results you need by simply chaining a ```.then(function(result) {})``` to some
method call that you know returns a promise, without really needing to know what's happening under the hood.  But there are some awesome features (and perilous pitfalls) that deserve our attention. In this post, I'd like to share some of those features in an unconventional way- through functional tests.

I agree with this excellent article from pouchDb: [We have a problem with
promises](http://pouchdb.com/2015/05/18/we-have-a-problem-with-promises.html), which makes the point that common explanations for promises are often unhelpful. Many of these explanations rely too heavily on metaphor. In this post, we'll eschew metaphor and, with the power of testing, dig into what promises are __actually doing__.

### A look at lie.js ###
After reading [We have a problem with
promises](http://pouchdb.com/2015/05/18/we-have-a-problem-with-promises.html), I was determined to solidify my own understanding of promises. The article mentioned [lie.js](https://github.com/calvinmetcalf/lie/tree/master/dist), a lightweight promise implementation that nevertheless met all the requirements of the [Promises/A+ Specification](https://promisesaplus.com/).  I decided to re-write most of lie.js in my own words, trying to understand the code as I went. After a great deal of console logging and head scratching, the core concepts began to come together, highlighting a series of "inflection points".  These inflection points seemed like the key to understanding __how__ a promise implementation like lie.js works.

A quick tl;dr of our promise implementation could be this:
> A __promise__ is an object that holds a flag indicating its state (pending, resolved, or rejected), an (initially null) outcome value (or error), and a queue of "callback pairs", objects that contain a success and error callback along with a reference to a new, internally created promise. (the ```.then``` method is how we add to this queue). When the original promise gets fulfilled or rejected, it sets the outcome value and iterates through its queue, resolving or rejecting with that value.  The promises referenced in the queue, in turn, fulfill or reject their own queue items and so on recursively until the chain is complete.

When we dig into these "inflection points", the actual mechanisms behind our implementation will become increasingly clear.

### Too late to TDD? ###
At work and at home, I adhere as strongly as possible to __Test-Driven Development__.  This means that, when writing new code, I almost always write a test first.  The benefits of this practice are two fold:
* Your tests, from the start, provide a safety net for your application, ensuring that functionality is working properly and alerting you when it is not.
* You application reflects __your understanding__ of __what__ and __how__ functionality should work, as dictated by your tests.

I have found that the second point has even greater long-term benefits than the first.  Your application grows with your tests, which grow with your understanding.  

But what if the "Driven" part is taken away, and the code is already completely implemented?  Can tests help us anymore?  I assert that they can. Although "back-filling" tests is usually a practice to be avoided and a bit of a pain, writing tests is the best way to ensure that your understanding and the code are in sync.  These tests will provide the path to understanding our promise implementation.

### Inflection points and functional tests ###
When I began back-filling tests for my promise implementation, I started with unit tests. This was a great way to solidify my understanding of each individual method. For example, here is my unit test for the ```.then``` method on my promise class:

```javascript
describe('.prototype.then', function() {
  it('creates a new internal promise and adds a queue item with the success and failure callbacks', function() {
    spyOn(window, 'ResolveThenable');
    spyOn(window, 'QueueItem');
    var successCallback = {};
    var failureCallback = {};

    var testPromise = new MyPromise({});
    var result = testPromise.then(successCallback, failureCallback);

    expect(result.queue.length).toBe(0);
    expect(testPromise.queue.length).toBe(1);
    expect(testPromise.queue[0]).toEqual(jasmine.any(QueueItem));
    expect(window.QueueItem).toHaveBeenCalledWith(jasmine.any(MyPromise), successCallback, failureCallback);
  });
});
```

Atomic, isolated unit tests are the foundation of a well-tested application, and ensure that each cog in the machine is doing exactly what it should be. Functional tests, on the other hand, ensure that those cogs are working together correctly to produce the results we expect. Instead of testing each individual method or property, we'll interact with our promise implementation as a whole. By controlling input and asserting output, we will illuminate the inner workings of a promise and the path that it takes through our code. Each of our inflection points is the perfect candidate for such functional tests. Here are the inflection points we will investigate:

1. When a promise is instantiated by a user, it executes.
2. ```.then``` method calls add a "queue item", and return a new internal promise, exposing its own ```.then``` method.
3. If a queue item contains a success callback function, that function executes when the promise in which it lives resolves.
4. If a queue item contains a failure callback function, that function executes when the promise in which it lives is rejected.
5. If a success (or failure) callback returns a new instance of a promise, the internal promise resolves (or rejects) from the new promise.

These inflection points demonstrate the mechanisms behind how promises are used - When they execute (1), what ```.then``` actually does (2), when and where our callbacks are used (3 and 4) as well as how promises can be chained together (2 and 5).  Our functional tests will help us understand exactly where and how these inflection points are implemented, and we'll be well on our way to a deeper understanding... __I promise__ (just that one time, I swear...)

Let's step through these functional tests, one at a time.  __Before we begin__, a few quick testing notes:
* I'm using [jasmine](http://jasmine.github.io/). I've included a link to my spec runner [Here]({{ site.baseurl }}public/testSuites/promiseTest/specRunner.html) so you can run them yourself in the browser. You can also see the test suite [Here]({{ site.baseurl }}public/testSuites/promiseTest/spec/functionalPromiseSpec.js) and the source MyPromise.js [Here]({{ site.baseurl }}public/testSuites/promiseTest/src/MyPromise.js)
* ```jasmine.createSpy()``` is used to create an jasmine spy object. Using this object as input allows us to make asserions about what happens to the object as it passes through the code (was it called? with what arguments?)
* ```spyOn.and.callThrough()``` is used to create a spy for a function without interfering with how it works.
* ```jasmine.createSpy().and.callFake(function() {})``` is used to create a jasmine spy object that behaves how we specify.
* All of my tests are referencing a single file: check it out if you'd like to see the implementation and not just test examples.

#### 1. When a promise is instantiated by a user, it executes. ####
While very simple, this is an important point to note before proceeding. When a promise is instantiated, and the code is run, the function we pass in (referred to as a "resolver") is going to execute. Our resolver will be provided with 2 arguments, a "success" callback and "failure" callback. It is up to __our__ resolver function to decide if and when those callbacks are executed. When they are, however, the chain of resolution will kick off. So our test will verify that the function is called, without any delay, and provided these callbacks:

```javascript
describe('MyPromise Inflection points', function() {
  it('1. When a promise is instantiated by a user, it executes', function() {
    var resolver = jasmine.createSpy();

    var myPromise = new MyPromise(resolver);

    expect(resolver).toHaveBeenCalledWith(jasmine.any(Function), jasmine.any(Function));
  });
});
```

#### 2. ```.then``` method calls add a "queue item", and return a new internal promise, exposing its own ```.then``` method. ####

The ```.then``` method is where we put our promise to use, enqueuing functions that execute when a promise is either fulfilled or rejected. In our test, we'll check the promise queue for a "queue item", and ensure that our callbacks, and a new internal promise, are set on it.  We can then test that this new internal promise is returned to us so we can call ```.then``` on __it__.

```javascript
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
```

#### 3. If a queue item contains a success callback function, that function executes when the promise in which it lives resolves. ####
Now we've verified that a "queue item" object contains a reference to a new promise and its success and failure callbacks, and that this object lives in a queue on its "parent" promise, diligently placed there by the ```.then``` method.  In this next test, we verify that when this parent promise is resolved with a value, the success callback will be called with that value. Whatever value the callback returns, the "child" promise will be resolved with that.

Our setup is more complicated in this test. We'll actually implement an asynchronous resolver (simulating something like an xhr request or database lookup). Fortunately, jasmine provides a ```done``` callback argument that we can choose to use in our ```beforeEach``` function. If we choose to use it, Jasmine won't proceed to the actual assertions until that method is called. By placing that ```done``` call in our final ```.then``` callback, we are also testing that our promise is working as we expect. If that callback is never called, our test will timeout and throw up its hands in failure.

```javascript
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
```

#### 4. If a queue item contains a failure callback function, that function executes when the promise in which it lives is rejected. ####
This test will directly mirror the previous test, but will introduce two major additional points. The first point is that a promise that throws an uncaught error is rejected, with the error as the outcome value. Our test will throw an error to prove that point. Additionally, our test will use ```.catch``` instead of ```.then```, which turns out to be more or less syntactic sugar around the latter method, providing ```null``` for the success callback argument.

```javascript
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
```

#### 5. When a callback function executes, the value returned is checked. If it is determined to be a promise itself, that promise executes. ####
Finally, we look at the other aspect of chaining. Since ```.then``` methods return "internal" promises, we can keep chaining them (so long as we return a value from our callbacks, otherwise our promise will be fulfilled with a value of ```undefined```). It turns out we can return completely NEW promise declarations as well as regular values (or thrown errors).  Our test will demonstrate that, if our ```.then``` callback returns a completely new promise instance, any chained ```.then``` methods from that point will execute when this new promise resolves, and our internal promise will resolve with the new promise value.

```javascript
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
```

#### 5.1. The results of the new promise instance are passed along ####
Although part of the above test, I've brought attention to this assertion because it proves an important point - when my original promise resolves with a value, and I instantiate a new promise in my ```.then``` method, my internal promise (which resolves with that value) passes it along. We can use that value as part of our logic for our new promise. If we continue chaining in this way, we can start to build some really cool stuff.

```javascript
it('The result value of the promise instance is available for the next promise', function() {
  expect(newPromise.queue[0].successCallback).toBe(successCallback2);
  expect(thirdPromise.outcomeValue).toBe(secondValue + additionValue);
});
```

### The promised benefits of good test coverage ###
While by no means exhaustive, hopefully these inflection points and their functional test demonstrations provide a closer look at the underlying mechanisms of a promise implementation. As a side effect, we've also seen some methods for asynchronous testing in Javascript (yet another topic of simultaneous fun and frustration).

There is no shortage of wonderful explanations and discussions, in print and online, of essential programming concepts in modern web development today, promises especially. But, if you're like me, those concepts really don't sink in until actually working with the code. Good tests provide the bridge to that understanding __in code__. And while perhaps best when used in the beginning, those same tests can certainly help you build a bridge from the end, as well.
