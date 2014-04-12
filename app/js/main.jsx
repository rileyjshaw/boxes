/** @jsx React.DOM */

var React = require('react/addons');
var UI = require('../react/ui.jsx');

React.renderComponent(
  <UI cdnUrl="own-this-website.com" socketUrl="toyserver.rileyjshaw.com" socketPort=':8001' />,
  document.getElementById('app-container')
);
