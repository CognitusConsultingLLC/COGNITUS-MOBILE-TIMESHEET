sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"sap/ui/core/routing/History",
	"cgdc/timesheet/controller/BaseController",
	"sap/ui/model/json/JSONModel"
], function (Controller, History, BaseController, JSONModel) {
	"use strict";

	return BaseController.extend("cgdc.timesheet.controller.detaildetail", {

		/**
		 * Called when a controller is instantiated and its View controls (if available) are already created.
		 * Can be used to modify the View before it is displayed, to bind event handlers and do other one-time initialization.
		 * @memberOf cgdc.timesheet.view.detaildetail
		 */
		onInit: function () {
			this.oFormatddMMyyyy = sap.ui.core.format.DateFormat.getInstance({
				pattern: "dd/MM/yyyy",
				calendarType: sap.ui.core.CalendarType.Gregorian
			});
			this.oFormatyyyymmdd = sap.ui.core.format.DateFormat.getInstance({
				pattern: "yyyyMMdd",
				calendarType: sap.ui.core.CalendarType.Gregorian
			});
			this.oControl = this.getOwnerComponent().getModel("controls");
			this.Router = this.getOwnerComponent().getRouter();
			this.getOwnerComponent().getRouter().getRoute("detaildetail").attachPatternMatched(this.onRouteMatched, this);
		},
		onRouteMatched: function (oEvent) {
			var oData = this.getModel("aTableRowsdays").getData();
			this.iIndex = parseInt(oEvent.getParameters("arguments").arguments.index);
			this.sIndex = parseInt(oEvent.getParameters("arguments").arguments.sindex);
			if (oData.length) {
				var oDate = oData[this.iIndex].rowsdata[this.sIndex].WORKDATE;
				this.byId("iddetaildetail").setTitle(this.getResourceBundle().getText("detaildetailpagetitle", [this.oFormatddMMyyyy.format(new Date(
					oDate))]));
				var data = oData[this.iIndex].rowsdata[this.sIndex];
				data.CATSHOURS = parseFloat(data.CATSHOURS.split(":")[0]).toFixed(2);
				var data1 = $.extend(true, {}, data);
				this.getModel("aTableRowsday").setData(data1);
				this.getModel("aTableRowsday").refresh();
			} else {
				this.Router.navTo("default", {});
			}
		},
		onNavBacktoDetailDetail: function (oEvent) {
			var oHistory = History.getInstance();
			var sPreviousHash = oHistory.getPreviousHash();
			if (sPreviousHash !== undefined) {
				window.history.go(-1);
			} else {
				this.oRouter.navTo("detail", {
					index: this.iIndex
				});
			}
		},
		onChangeHoursStep: function (oEvent) {
			var val = /^\d+(\.\d{1,2})?$/;
			if (val.test(oEvent.getSource().getValue())) {
				var that = this;
				var data = this.getModel('TimeData').getData();
				var oData = this.getModel("aTableRowsdays").getData();
				var sPosid = this.getModel("aTableRowsdays").getData()[this.iIndex].posid;
				var oDate = this.getModel("aTableRowsdays").getData()[this.iIndex].rowsdata[this.sIndex].WORKDATE;
				oData[this.iIndex].rowsdata[this.sIndex].CATSHOURS = parseFloat(oEvent.getSource().getValue()).toFixed(2);
				this.getModel("aTableRowsdays").refresh();
				this.getModel("aTableRowsday").setData(oData[this.iIndex].rowsdata[this.sIndex]);
				var record = data.find(function (entry, id) {
					return that.oFormatyyyymmdd.format(entry.TimeEntryDataFields.WORKDATE) === that.oFormatyyyymmdd
						.format(oDate);
				});
				record.TimeEntryDataFields.CATSHOURS = parseFloat(oEvent.getSource().getValue()).toFixed(2);
				record.TimeEntryDataFields.WrkLoc = this.getModel("aTableRowsdays").getData()[this.iIndex].wrkloc;
				record.TimeEntryDataFields.ProjTimeCat = this.getModel("aTableRowsdays").getData()[this.iIndex].timecat;
				if (record.Counter) {
					record.TimeEntryOperation = 'U';
				} else {
					record.TimeEntryOperation = 'C';
				}
				this.oControl.setProperty("/overviewCancel", true);
				this.oControl.setProperty("/overviewDataChanged", true);
				this.oControl.setProperty("/isOverviewChanged", true);
				this.oControl.setProperty("/sendForApproval", true);
				this.getModel("TimeData").refresh();
				sap.m.MessageToast.show(that.getResourceBundle().getText("changed"));
			}
		},
		onliveChangelongTextItemDetail: function (oEvent) {
			var sValue = oEvent.getParameters("value").value;
			var that = this;
			var data = this.getModel('TimeData').getData();
			var oData = this.getModel("aTableRowsdays").getData();
			var sPosid = this.getModel("aTableRowsdays").getData()[this.iIndex].posid;
			var oDate = this.getModel("aTableRowsdays").getData()[this.iIndex].rowsdata[this.sIndex].WORKDATE;
			if (sValue) {
				oData[this.iIndex].rowsdata[this.sIndex].LONGTEXT_DATA = sValue;
				oData[this.iIndex].rowsdata[this.sIndex].LONGTEXT = "X";
				this.getModel("aTableRowsday").setProperty("/LONGTEXT_DATA", sValue);
			} else {
				oData[this.iIndex].rowsdata[this.sIndex].LONGTEXT_DATA = "";
				oData[this.iIndex].rowsdata[this.sIndex].LONGTEXT = "";
				this.getModel("aTableRowsday").setProperty("/LONGTEXT_DATA", "");
			}
			this.getModel("aTableRowsdays").refresh();
			var record = data.find(function (entry, id) {
				return that.oFormatyyyymmdd.format(entry.TimeEntryDataFields.WORKDATE) === that.oFormatyyyymmdd
					.format(oDate);
			});
			var iActualTime = that.timeToDecimal(oData[this.iIndex].rowsdata[this.sIndex].CATSHOURS);
			if (record.Counter) {
				record.TimeEntryOperation = 'U';
			} else {
				if (iActualTime !== 0) record.TimeEntryOperation = 'C';
			}
			record.TimeEntryDataFields.LONGTEXT_DATA = sValue;
			record.TimeEntryDataFields.LONGTEXT = "X";
			this.getModel("TimeData").refresh();
			this.oControl.setProperty("/overviewCancel", true);
			this.oControl.setProperty("/overviewDataChanged", true);
			this.oControl.setProperty("/isOverviewChanged", true);
			this.oControl.setProperty("/sendForApproval", true);
			sap.m.MessageToast.show(that.getResourceBundle().getText("changed"));
		},

		/**
		 * Similar to onAfterRendering, but this hook is invoked before the controller's View is re-rendered
		 * (NOT before the first rendering! onInit() is used for that one!).
		 * @memberOf cgdc.timesheet.view.detaildetail
		 */
		//	onBeforeRendering: function() {
		//
		//	},

		/**
		 * Called when the View has been rendered (so its HTML is part of the document). Post-rendering manipulations of the HTML could be done here.
		 * This hook is the same one that SAPUI5 controls get after being rendered.
		 * @memberOf cgdc.timesheet.view.detaildetail
		 */
		//	onAfterRendering: function() {
		//
		//	},

		/**
		 * Called when the Controller is destroyed. Use this one to free resources and finalize activities.
		 * @memberOf cgdc.timesheet.view.detaildetail
		 */
		//	onExit: function() {
		//
		//	}

	});

});