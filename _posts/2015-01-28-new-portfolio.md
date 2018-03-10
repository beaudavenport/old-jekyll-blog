---
layout: post
title: New Beginnings
---

After spending some time getting my feet wet with [Jekyll](http://jekyllrb.com/), I'm happy to introduce my new 
portfolio/blog website.  I first heard about Jekyll through [Github pages](https://pages.github.com/), which I had already
been using (very happily) for my original portfolio site.  There was a little bit of a learning
curve initially, but the more I played around with Jekyll, the more fun I had with it- and the
more potential I saw for future projects.

For the new site, I began with [Poole](http://getpoole.com), which offers an excellent starting 
point and includes most of the necessary boilerplate. Instead of using bootstrap, I took
inspiration from the Poole theme [Hyde](http://hyde.getpoole.com/) and used a few basic
breakpoints for responsive elements.  I also utilized several SASS mixins for sidebar buttons.

The most exciting change for me was the use of jekyll's <code>collections</code>.
In my previous site, any new projects were hard-coded with HTML.

<div class="post-image">
    <img src="{{ '/public/images/old-portfolio.png' | relative-url }}">
    <p class="image-caption">My previous portfolio site</p>
</div>

I took advantage of the Liquid templating engine used by Jekyll to create a much DRYer 
approach to my portfolio. I created a collection of "projects", which are simply markdown files 
(much like this blog post) where I add [Front Matter](http://jekyllrb.com/docs/frontmatter) variables at the top of the file. Besides
the usual _title_ variable, I specify two additional variables- one for each of my project screenshot urls:

    ---
    title: Inventory Helper
    mobile_url: public/images/inventory-mobile.png
    full_url: public/images/inventory-full.png
    ---

The "mobile_url" and "full_url" are then available as variables in my <code>portfolio.html</code>,
thanks to the Liquid Templating. I loop through all of the projects in my 
<code>_projects</code> folder, wherein I include the images using these variables. 
I also added a "toggle" button under the automatically loaded
images that switches between the mobile and full-screen screenshots. Visit my 
[portolio page]({{ '/portfolio' | relative-url }}) to see it in action.

All in all, I'm excited to be using Jekyll now for my portfolio.
I'll be posting more about javascript, ruby, and front-end development, so check back soon. 
Visit my [portolio]({{ '/portfolio' | relative-url }}) and my [about page]({{ '/about' | relative-url }}) to
learn more about me and see examples of my work!

Cheers!