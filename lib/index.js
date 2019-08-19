"use strict";

/**
 * Module dependencies.
 */

var fmt = require("@segment/fmt");
var integration = require("@segment/analytics.js-integration");
var when = require("do-when");

/**
 * Expose `FunnelEnvy` integration.
 *
 */

var FunnelEnvy = (module.exports = integration("FunnelEnvy")
  .global("funnelEnvy") // prevent duplicate loads
  .assumesPageview()
  .readyOnLoad()
  .option("organizationId", "")
  .option("apiURL", "//backstage.funnelenvy.com"));

/**
 * Initialize.
 */
FunnelEnvy.prototype.initialize = function() {
  var self = this;
  this.load(function() {
    // add listeners for active campaign & variation
    window.funnelEnvy.addListener(
      "backstage.activeVariation",
      self.sendActiveVariation
    );

    self.ready();
  });
};

/**
 * Are we loaded?
 *
 * @return {Boolean}
 */
FunnelEnvy.prototype.loaded = function() {
  return !!window.funnelEnvy;
};

/**
 * FunnelEnvy load handler. Sets window.funnelEnvy
 *
 * @param {Function} done Callback to invoke when the script is loaded.
 */

FunnelEnvy.prototype.load = function(done) {
  var scriptUrl = fmt(
    "//cdn2.funnelenvy.com/organization/%s/backstage-client.js",
    this.options.organizationId
  );

  var self = this;
  this.loadFunnelEnvyScript(scriptUrl, function() {
    window.funnelEnvy = new window.FunnelEnvy({
      customerId: self.options.organizationId,
      apiUrl: self.options.apiURL
    });
  });

  when(this.loaded, done);
};

/**
 * Loads the FunnelEnvy script
 *
 * @param {string} Script URL to load
 * @param {Function} callback when loaded
 */
FunnelEnvy.prototype.loadFunnelEnvyScript = function(scriptUrl, callback) {
  /* eslint-disable */
  (function (a,e){var n=document.createElement("script");n.type="text/javascript",n.readyState?n.onreadystatechange=function(){"loaded"!==n.readyState&&"complete"!==n.readyState||(n.onreadystatechange=null,e())}:n.onload=function(){e()},n.src=a,document.getElementsByTagName("head")[0].appendChild(n)})(scriptUrl, callback);
  /* eslint-enable */
};

/**
 * Handle Analytics.js identify. Maps traits to individual attributes in FunnelEnvy
 * @param {Identify} identify
 */
FunnelEnvy.prototype.identify = function(identify) {
  var individualTraits = identify.traits();
  window.funnelEnvy.push({
    event: "segment.identify",
    attributes: { individual: individualTraits }
  });
};

/**
 * Handle Analytics.js group. Maps traits to account attributes in FunnelEnvy
 * @param {Group} group
 */
FunnelEnvy.prototype.group = function(group) {
  var accountTraits = group.traits();
  window.funnelEnvy.push({
    event: "segment.group",
    attributes: { account: accountTraits }
  });
};

/**
 * Track. Proxies events and associated properties directly to FunnelEnvy
 *
 * @param {Track} track
 */
FunnelEnvy.prototype.track = function(track) {
  window.funnelEnvy.push({
    event: track.event(),
    attributes: track.properties()
  });
};

/**
 * Send data to segment via the track call. This will respond to the activeVariation message
 * @param {model} - The data layer model
 * @param {message} - the data layer event message
 */
FunnelEnvy.prototype.sendActiveVariation = function(model, message) {
  // make sure this is the right message
  if (!message || message.event !== "backstage.activeVariation") {
    return;
  }

  /* eslint-disable no-underscore-dangle */
  var trackedProps = {
    bvid: window.funnelEnvy._fe_bvid,
    campaignId: model.backstage.activeCampaign.slug,
    campaignName: model.backstage.activeCampaign.name,
    campaignGroup: model.backstage.activeCampaign.isInHoldback
      ? "holdback"
      : "predicted",
    variationId: model.backstage.activeVariation.variationId, // should we use the slug? Currently not in the data model
    variationName: model.backstage.activeVariation.name
  };
  /* eslint-enable no-underscore-dangle */

  this.analytics.track("Variation Activated", trackedProps);
};
