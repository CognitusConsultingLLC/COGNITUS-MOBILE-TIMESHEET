sap.ui.define([
	"sap/ui/model/json/JSONModel",
	"sap/ui/Device"
], function (JSONModel, Device) {
	"use strict";
	var oDataModel = null;
	var oBundle = null;
	var oComponent = null;
	var oRouter = null;

	return {

		createDeviceModel: function () {
			var oModel = new JSONModel(Device);
			oModel.setDefaultBindingMode("OneWay");
			return oModel;
		},
		initoDataModel: function (oData) {
			oDataModel = oData;
			// return oDataModel;
		},
		initoBundle: function (oText) {
			oBundle = oText;
			// return oBundle;
		},
		initComponent: function (component) {
			oComponent = component;
		},
		initoRouter: function (router) {
			oRouter = router;
		},
		getoRouter: function () {
			return oRouter;
		},
		getoComponent: function () {
			return oComponent;
		},
		getoDataModel: function () {
			return oDataModel;
		},
		getoBundle: function () {
			return oBundle;
		}

	};
});