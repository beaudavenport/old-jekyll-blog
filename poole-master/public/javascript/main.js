// Sitewide js

$(function() {
    
    // Toggle between the mobile image display and full-screen image display
    $(".toggle-button").click(function() {
        var parent = $(this).parent();
        parent.slideToggle(function() {
            // (Mobile display div and full-screen display div are the only siblings)
            parent.siblings().slideToggle();
        });
    });
    
});