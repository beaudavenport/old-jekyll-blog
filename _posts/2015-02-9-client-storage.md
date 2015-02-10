---
layout: post
title: Client-side Storage "Gotcha"- localStorage vs. sessionStorage
---

One of the best tutorials I utilized in my [Inventory Helper]({{ site.baseurl }}portfolio/#inventory_helper)
application was written on Sitepoint - _[Using JSON Web Tokens with Node.js](http://www.sitepoint.com/using-json-web-tokens-node-js/)_.
In many ways, JSON Web Tokens (also known as JWT's, or "jots") are an increasingly attractive solution
to using persistent data with a REST-ful API back-end.  No plaintext, no cookies, no sessions,
just encrypted JSON data that we can easily serve to the client and then attach on subsequent 
HTTP calls once a user completes the initial authentication process.

In this particular tutorial, the JWT is stored in `window.localStorage`.  The 
[Web Storage API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Storage_API) is 
the HTML5 solution to a browser-based persistence layer for client-side data.  Data is stored
as key-value pairs which you `set`: 

    localStorage.setItem("foo", "bar");
    
and then `get` just as easily:

    localStorage.getItem("foo"); 
    => "bar"

and just as easily be cleared out with the `clear` method:

    localStorage.clear();
    
You can use Web Storage to hold JWT's or any other data that needs to persist on the client.
For example, [the backbone.js documentation recommends](http://backbonejs.org/#FAQ-bootstrap)
that the initial data used by a backbone application should be bootstrapped into place upon loading,
_i.e._ instead of an AJAX call after the application script loads. Following this recommendation,
I used Web Storage to store my inital data "payload" for use once my application loaded.

This turned out to be the source of my "gotcha".

## _localStorage_... or _sessionStorage_?

<br />
Web Storage is convenient, intuitive, and well-supported across modern browsers. 
But what about security?  What happens to the data that we're storing? 

Well, the data within Web Storage is limited to the client's particular device, and authentication measures like JSON Web Tokens can have expirations
or other security measures set up server-side.  It's up to the developer to be
vigilant about _what_ data is being saved in Web Storage and _how_ it is being persisted. That persistence is
determined by whether you use the `window.localStorage` method or the
`window.sessionStorage` method.  

`sessionStorage` persists whatever data is saved into it
__as long as the broswer window (or tab) is open__. You can reload the page, and your data
will still be there, but if you close the tab (or browser) it's toast. `localStorage`, on the 
other hand, persists the data that is saved into it __until an application, the user, or the browser
itself deletes it (i.e, via clearing browser cookies)__. 

This is an important distinction, and the functionality of your application will determine which
of these methods to use.  Suppose, for example, that you had a web application that featured news headlines in a 
variety of subjects. Perhaps a user could choose their favorite subject (which you could `set` in 
`localStorage`), and news headlines for that subject would bubble to the top of the page.
On subsequent visits, the application would be able to `get` the favorite subject 
specified by the user.  A simple, effective and persistent solution.  If you instead used
`sessionStorage` for this functionality, the user's favorite subject
would be lost every time they closed the tab they were reading.  Not ideal.

On the other hand, suppose that this application prompted a user to login every time
they visited the page, using a JSON Web Token that was stored in `localStorage`.  Indeed
the user may open a new tab or window and navigate to the website, but unless otherwise
deleted, the `localStorage` data from the previous visit would __still be present__.  The user
may see a login prompt, but the JSON Web Token would still (for the moment at least) be
right there in `localStorage`. If, however, the application stored the token in `sessionStorage`,
the token would not persist after the window was closed.  Next time they visit the page and
are prompted to login, the Web Storage would indeed be empty.

My personal "gotcha" took the form of the second scenario.  My inventory application
prompts the user to login each time they visit the site in a new tab or window,
and serves a new JSON Web Token.  Having failed, initially, to 
distinguish between the two Web Storage methods, my use of `localStorage` in my application
allowed data to persist until subsequent visits.  An important point here is that 
__this data persistence had no effect on my application.__ Since my application generates
a new JSON Web Token on each login and clears `localStorage` on every logout, that data went
unnoticed... until I dug deeper into the Web Storage API and realized my mistake.
While perhaps unlikely, if another user had access to the device used by the intended
user and knew where to look, they would have access to any information stored there with
simple use of the broswer console. An embarrassing overlook on my part, but an important
lesson learned.

All in all, Web Storage is a great HTML5 feature that I highly recommend.  But be careful
to distinguish between `sessionStorage` and `localStorage` when implementing it!