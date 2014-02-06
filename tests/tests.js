// in order to see the app running inside the QUnit runner
App.rootElement = '#ember-testing';

// Common test setup
App.setupForTesting();
App.injectTestHelpers();

// common QUnit module declaration
module("Integration tests", {
  setup: function() {
    // before each test, ensure the application is ready to run.
    Ember.run(App, App.advanceReadiness);
  },

  teardown: function() {
    // reset the application state between each test
    App.reset();
  }
});

// QUnit test case
test("render", function() {
  visit("/");
  andThen(function() {
    equal(find("h4").text(), "request", "Application is rendered");

  });
});

/*
test("submit", function(){
    visit("/");
    click("button");
    andThen(function() {
        ok(find("h1:contains('A new post')").length, "The post's title should display");
        ok(find("a[rel=author]:contains('John Doe')").length, "A link to the author should display");
    });
});
*/