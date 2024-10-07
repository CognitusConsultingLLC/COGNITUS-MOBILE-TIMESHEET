sap.ui.define([
	"sap/ui/core/UIComponent",
	"sap/ui/Device",
	"cgdc/timesheet/model/models",
	"cgdc/timesheet/controller/ErrorHandler"
], function (UIComponent, Device, models, ErrorHandler) {
	"use strict";

	return UIComponent.extend("cgdc.timesheet.Component", {

		metadata: {
			manifest: "json"
		},

		/**
		 * The component is initialized by UI5 automatically during the startup of the app and calls the init method once.
		 * @public
		 * @override
		 */
		init: function () {
			this.setModel(new sap.ui.model.json.JSONModel(), "PernrModel");
			this.setModel(new sap.ui.model.json.JSONModel(), "ZattabsModel");
			this.setModel(new sap.ui.model.json.JSONModel(), "ZattabsModelSecBased");
			this.setModel(new sap.ui.model.json.JSONModel(), "EmpDetailModel");
			this.setModel(new sap.ui.model.json.JSONModel(),"aTableRows");
			this.setModel(new sap.ui.model.json.JSONModel(),"aTableRowsAbs");
			this.setModel(new sap.ui.model.json.JSONModel(),"aTableRowsMain");
			this.setModel(new sap.ui.model.json.JSONModel(),"aTableRowsHours");
			this.setModel(new sap.ui.model.json.JSONModel(),"aTableRowsdays");
			this.setModel(new sap.ui.model.json.JSONModel(),"aTableRowsday");
			this.setModel(new sap.ui.model.json.JSONModel(),"TimeData");
			this.setModel(new sap.ui.model.json.JSONModel(),"TimeDataTemp");
			this.setModel(new sap.ui.model.json.JSONModel(),"AdminTypeData");
			this.setModel(new sap.ui.model.json.JSONModel(),"Worklist");
			this.setModel(new sap.ui.model.json.JSONModel(),"Projects");
			this.setModel(new sap.ui.model.json.JSONModel(),"controls");
			this.setModel(new sap.ui.model.json.JSONModel(), 'deleteRecords');
			this.setModel(new sap.ui.model.json.JSONModel(), 'changedRecords');
			this.setModel(new sap.ui.model.json.JSONModel(), 'newRecords');
			this.setModel(new sap.ui.model.json.JSONModel(), 'OdataResponseData');
			this.setModel(new sap.ui.model.json.JSONModel(), 'DuplicateRecords');
			this.oMessageProcessor = new sap.ui.core.message.ControlMessageProcessor();
			this.oMessageManager = sap.ui.getCore().getMessageManager();

			this.oMessageManager.registerMessageProcessor(this.oMessageProcessor);
			// initialize the error handler with the component
			this._oErrorHandler = new ErrorHandler(this, this.oMessageProcessor, this.oMessageManager);
			// call the base component's init function
			UIComponent.prototype.init.apply(this, arguments);

			// enable routing
			this.getRouter().initialize();

			// set the device model
			this.setModel(models.createDeviceModel(), "device");
			
			models.initoRouter(this.getRouter());
			models.initComponent(this);

			// if (!document.getElementById("jira-custom")) {
			// 	var t = document.createElement("script");
			// 	t.setAttribute("id", "jira-custom");
			// 	t.setAttribute("type", "text/javascript");
			// 	t.setAttribute("src",
			// 		"https://cognitus.atlassian.net/s/d41d8cd98f00b204e9800998ecf8427e-T/-dtzt95/b/6/c95134bc67d3a521bb3f4331beb9b804/_/download/batch/com.atlassian.jira.collector.plugin.jira-issue-collector-plugin:issuecollector/com.atlassian.jira.collector.plugin.jira-issue-collector-plugin:issuecollector.js?locale=en-US&collectorId=1c684bda"
			// 	);
			// 	document.body.appendChild(t)
			// }
		},
		destroy: function () {
			this._oErrorHandler.destroy();
			// call the base component's destroy function
			UIComponent.prototype.destroy.apply(this, arguments);
		},
		getContentDensityClass: function () {
			if (this._sContentDensityClass === undefined) {
				// check whether FLP has already set the content density class; do nothing in this case
				if (jQuery(document.body).hasClass("sapUiSizeCozy") || jQuery(document.body).hasClass("sapUiSizeCompact")) {
					this._sContentDensityClass = "";
				} else if (!Device.support.touch) { // apply "compact" mode if touch is not supported
					this._sContentDensityClass = "sapUiSizeCompact";
				} else {
					// "cozy" in case of touch support; default for most sap.m controls, but needed for desktop-first controls like sap.ui.table.Table
					this._sContentDensityClass = "sapUiSizeCozy";
				}
			}
			return this._sContentDensityClass;
		}
	});
});