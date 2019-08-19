/* eslint-disable no-shadow */

"use strict";

var Analytics = require("@segment/analytics.js-core").constructor;
var integration = require("@segment/analytics.js-integration");
var sandbox = require("@segment/clear-env");
var tester = require("@segment/analytics.js-integration-tester");

var FunnelEnvy = require("../lib/");

describe("FunnelEnvy", function() {
  var analytics;
  var funnelenvy;
  var options = {
    organizationId: "testOrgId"
  };

  beforeEach(function() {
    analytics = new Analytics();
    funnelenvy = new FunnelEnvy(options);
    analytics.use(FunnelEnvy);
    analytics.use(tester);
    analytics.add(funnelenvy);
    analytics.stub(funnelenvy, "loadFunnelEnvyScript", function(
      scriptUrl,
      callback
    ) {
      setTimeout(function() {
        window.FunnelEnvy = function FunnelEnvy() {
          this.addListener = function() {};
        };
        callback();
      }, 50);
    });
  });

  afterEach(function() {
    analytics.restore();
    analytics.reset();
    funnelenvy.reset();
    sandbox();
  });

  it("should have the right settings", function() {
    analytics.compare(
      FunnelEnvy,
      integration("FunnelEnvy")
        .global("funnelEnvy")
        .assumesPageview()
        .readyOnLoad()
        .option("organizationId", "")
        .option("apiURL", "//backstage.funnelenvy.com")
    );
  });

  describe("#initialize", function() {
    beforeEach(function() {
      analytics.stub(funnelenvy, "load");
    });

    it("should call #load", function() {
      analytics.didNotCall(funnelenvy.load);
      analytics.initialize();
      analytics.page();
      analytics.calledOnce(funnelenvy.load);
    });
  });

  describe("#loaded", function() {
    it("should return `false` when FunnelEnvy is not loaded", function() {
      analytics.assert(typeof window.funnelEnvy === "undefined");
      analytics.assert(funnelenvy.loaded() === false);
    });

    it("should return `true` when FunnelEnvy is loaded", function() {
      window.funnelEnvy = undefined;
      analytics.assert(funnelenvy.loaded() === false);

      window.funnelEnvy = function() {};
      analytics.assert(funnelenvy.loaded() === true);
    });
  });

  describe("loading", function() {
    beforeEach(function() {
      analytics.initialize();
      analytics.page();
    });

    it("should initialize `window.funnelEnvy`", function(done) {
      analytics.assert(typeof window.funnelEnvy === "undefined");
      analytics.once("ready", function() {
        analytics.called(funnelenvy.loadFunnelEnvyScript);
        analytics.assert(typeof window.funnelEnvy !== "undefined");
        done();
      });
    });
  });

  describe("after loading", function() {
    beforeEach(function(done) {
      analytics.once("ready", done);
      window.funnelEnvy = {};
      window.funnelEnvy.addListener = function() {};
      analytics.spy(window.funnelEnvy, "addListener");
      analytics.initialize();
      analytics.page();
    });

    it("should add a listener for activeVariation", function() {
      analytics.called(
        window.funnelEnvy.addListener,
        "backstage.activeVariation",
        funnelenvy.sendActiveVariation
      );
    });
  });

  describe("FunnelEnvy as a destination", function() {
    beforeEach(function(done) {
      window.funnelEnvy = {};
      window.funnelEnvy.addListener = function() {};
      window.funnelEnvy.push = function() {};
      analytics.spy(window.funnelEnvy, "push");
      analytics.once("ready", done);
      analytics.initialize();
      analytics.page();
    });

    describe("#identify", function() {
      it("should push segment.identify event with individual attributes", function() {
        var attrs = {
          name: "Bob Loblaw",
          email: "bob.loblaw@test.com",
          phone: "555-555-5555"
        };
        analytics.identify("user-id", attrs);
        analytics.called(window.funnelEnvy.push, {
          event: "segment.identify",
          attributes: {
            individual: {
              name: "Bob Loblaw",
              email: "bob.loblaw@test.com",
              phone: "555-555-5555",
              id: "user-id"
            }
          }
        });
      });
    });

    describe("#group", function() {
      it("should push segment.group event with account attributes", function() {
        var attrs = {
          name: "Bob Loblaw",
          email: "bob.loblaw@test.com",
          phone: "555-555-5555"
        };
        analytics.group("group-id", attrs);
        analytics.called(window.funnelEnvy.push, {
          event: "segment.group",
          attributes: {
            account: {
              name: "Bob Loblaw",
              email: "bob.loblaw@test.com",
              phone: "555-555-5555",
              id: "group-id"
            }
          }
        });
      });
    });

    describe("#track", function() {
      it("should push event with event attributes", function() {
        var attrs = {
          name: "Bob Loblaw",
          email: "bob.loblaw@test.com",
          phone: "555-555-5555"
        };
        analytics.track("event-name", attrs);
        analytics.called(window.funnelEnvy.push, {
          event: "event-name",
          attributes: {
            name: "Bob Loblaw",
            email: "bob.loblaw@test.com",
            phone: "555-555-5555"
          }
        });
      });
    });
  });

  describe("FunnelEnvy as a source", function() {
    describe("#sendActiveVariation", function() {
      beforeEach(function() {
        window.funnelEnvy = {};
        /* eslint-disable no-underscore-dangle */
        window.funnelEnvy._fe_bvid = "bvid";
        /* eslint-enable no-underscore-dangle */
        analytics.stub(analytics, "track");

        this.model = {
          backstage: {
            activeCampaign: {
              slug: "campaignSlug",
              name: "campaignName"
            },
            activeVariation: {
              variationId: 123,
              name: "variationName"
            }
          }
        };
        analytics.initialize();
      });

      it("should not call track if message is missing", function() {
        funnelenvy.sendActiveVariation(this.model, this.message);
        analytics.didNotCall(analytics.track);
      });

      it("should not call track if message is incorrect", function() {
        this.message = { event: "wrongMessage" };
        funnelenvy.sendActiveVariation(this.model, this.message);
        analytics.didNotCall(analytics.track);
      });

      it("should send predicted variation activated", function() {
        this.message = { event: "backstage.activeVariation" };
        this.model.isInHoldback = false;
        funnelenvy.sendActiveVariation(this.model, this.message);
        analytics.called(analytics.track, "Variation Activated", {
          bvid: "bvid",
          campaignId: "campaignSlug",
          campaignName: "campaignName",
          campaignGroup: "predicted",
          variationId: 123,
          variationName: "variationName"
        });
      });

      it("should send holdback variation activated", function() {
        this.message = { event: "backstage.activeVariation" };
        this.model.isInHoldback = true;
        funnelenvy.sendActiveVariation(this.model, this.message);
        analytics.called(analytics.track, "Variation Activated", {
          bvid: "bvid",
          campaignId: "campaignSlug",
          campaignName: "campaignName",
          campaignGroup: "predicted",
          variationId: 123,
          variationName: "variationName"
        });
      });
    });
  });
});
