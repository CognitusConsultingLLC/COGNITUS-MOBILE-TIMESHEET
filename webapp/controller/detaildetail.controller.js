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
			this.getView().byId("idMobComm").setValueState('None');
			this.getView().byId("idMobChReason").setValueState('None');
			this.iIndex = parseInt(oEvent.getParameters("arguments").arguments.index);
			this.sIndex = parseInt(oEvent.getParameters("arguments").arguments.sindex);
			if (oData.length) {
				var oDate = oData[this.iIndex].rowsdata[this.sIndex].WORKDATE;
				var oDateFormat = sap.ui.core.format.DateFormat.getDateInstance();
				this.byId("iddetaildetail").setTitle(this.getResourceBundle().getText("detaildetailpagetitle", [oDateFormat.format(new Date(
					oDate))]));

				let data = oData[this.iIndex].rowsdata[this.sIndex];
				// Added this change as part of CTS-57 for copy previous week change
				if(data.CATSHOURS === "" || parseInt(data.CATSHOURS) === 0){
					data.CATSHOURS = "00:00";
				}
				// Added the above change as part of CTS-57 for copy previous week change
				// if (data.CATSHOURS.split(":")[1] > "00") {
				// 	data.CATSHOURS = parseFloat(data.CATSHOURS.split(":")[0]) + "." + data.CATSHOURS.split(":")[1];
				// } else {
				// 	data.CATSHOURS = parseFloat(data.CATSHOURS.split(":")[0]).toFixed(2);
				// }
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
		onCheckMandatory: function () {
			let aRowData = this.getModel("aTableRowsday").getData();
			let sPosId = this.getModel("aTableRowsdays").getData()[0].posid;
			let sComments = this.getView().byId("idMobComm").getValue();
			let sChReason = this.getView().byId("idMobChReason").getSelectedKey();
			let bCheckFalied = false;
			let toastMsg;
			let bCheckCommMandate = this.getComReasonMandatory(sPosId, aRowData.STATUS);
			this.getView().byId("idMobComm").setValueState('None');
			this.getView().byId("idMobChReason").setValueState('None');
			if (bCheckCommMandate.ChReason && bCheckCommMandate.Comments && !sComments && !sChReason) {
				toastMsg = this.getResourceBundle().getText("msgReaCom");
				sap.m.MessageToast.show(toastMsg, {});
				bCheckFalied = true;
				this.getView().byId("idMobComm").setValueState('Error');
				this.getView().byId("idMobChReason").setValueState('Error');
			}
			else if (bCheckCommMandate.ChReason && !sChReason) {
				toastMsg = this.getResourceBundle().getText("msgReason");
				sap.m.MessageToast.show(toastMsg, {});
				bCheckFalied = true;
				this.getView().byId("idMobChReason").setValueState('Error');
			}
			else if (bCheckCommMandate.Comments && !sComments) {
				toastMsg = this.getResourceBundle().getText("msgComments");
				sap.m.MessageToast.show(toastMsg, {});
				bCheckFalied = true;
				this.getView().byId("idMobComm").setValueState('Error');
			}
			return bCheckFalied;
		},
		onChangeHoursStep: function (oEvent) {
			var self = this;
			//var val = /^\d+(\.\d{1,2})?$/;
			var timeEntry;
			//if (val.test(oEvent.getSource().getValue())) {
			var that = this;
			let aModelData = this.getModel("aTableRowsday").getData();
			let bComReaMandatory = this.onCheckMandatory();
			let sNewVal;
			// checking comments/change reason mandatory or not
			if(bComReaMandatory){ 
				sNewVal=this.formatter.calHoursQuanAmountInput(aModelData.CATSHOURS,aModelData.CATSQUANTITY,aModelData.CATSAMOUNT);
				oEvent.getSource().setValue(sNewVal);
				return;
			}
			//if (this.getModel("aTableRowsdays").getData()[this.iIndex].rowsdata[this.sIndex].CATSHOURS !== parseFloat(oEvent.getSource().getValue()).toFixed(2)) {
			if (this.getModel("aTableRowsdays").getData()[this.iIndex].rowsdata[this.sIndex].CATSHOURS !== oEvent.getSource().getValue()) {
				if (oEvent.getSource().getValue() > "24") {
					sap.m.MessageToast.show(that.getResourceBundle().getText("msgValidEntry"));
				} else {
					timeEntry = oEvent.getSource().getValue();//.toFixed(2).toString();
					if (oEvent.getSource().getValue().toString().split(":")[1] > "00") {
						timeEntry = self.adjustTime(timeEntry);
						oEvent.getSource().setValue(timeEntry);
					} else {
						//timeEntry = parseFloat(oEvent.getSource().getValue()).toFixed(2);
						timeEntry = self.adjustTime(timeEntry);
						oEvent.getSource().setValue(timeEntry);
					}
					var data = this.getModel('TimeData').getData();
					//var oWorkListModel = this.getModel("Worklist");
					//var aWorkListData = oWorkListModel.getData();
					//var aRow = aWorkListData.find(function (entry, id) {
					//	return entry.WorkListDataFields.POSID === sPosid;
					//});
					var oData = this.getModel("aTableRowsdays").getData();
					var sPosid = this.getModel("aTableRowsdays").getData()[this.iIndex].posid;
					var oWorkListModel = this.getModel("Worklist");
					var aWorkListData = oWorkListModel.getData();
					var aRow = aWorkListData.find(function (entry, id) {
						return entry.WorkListDataFields.POSID === sPosid;
					});
					var oDate = this.getModel("aTableRowsdays").getData()[this.iIndex].rowsdata[this.sIndex].WORKDATE;
					oData[this.iIndex].rowsdata[this.sIndex].CATSHOURS = timeEntry; //parseFloat(oEvent.getSource().getValue()).toFixed(2);
					this.getModel("aTableRowsdays").refresh();
					this.getModel("aTableRowsday").setData(oData[this.iIndex].rowsdata[this.sIndex]);
					var record = data.find(function (entry, id) {
						return that.oFormatyyyymmdd.format(entry.TimeEntryDataFields.WORKDATE) === that.oFormatyyyymmdd
							.format(oDate);
					});
					record.TimeEntryDataFields.CATSHOURS = this.timeToDecimal(timeEntry).toFixed(2);
					// Commented the below line of code as part of CTS-82
					//record.TimeEntryDataFields.CATSHOURS = parseFloat(oEvent.getSource().getValue()).toFixed(2);
					record.TimeEntryDataFields.WrkLoc = this.getModel("aTableRowsdays").getData()[this.iIndex].wrkloc;
					record.TimeEntryDataFields.ProjTimeCat = this.getModel("aTableRowsdays").getData()[this.iIndex].timecat;
					record.TimeEntryDataFields.LSTAR = aRow === undefined ? "" : aRow.WorkListDataFields.LSTAR;

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
			}
		},
		// onChangeHoursStep: function (oEvent) {
		// 	var self = this;
		// 	//var val = /^\d+(\.\d{1,2})?$/;
		// 	var timeEntry;
		// 	if (val.test(oEvent.getSource().getValue())) {
		// 		var that = this;
		// 		if (oEvent.getSource().getValue() > "24") {
		// 			sap.m.MessageToast.show(that.getResourceBundle().getText("msgValidEntry"));
		// 		} else {
		// 			timeEntry = oEvent.getSource().getValue();//.toFixed(2).toString();
		// 			if (oEvent.getSource().getValue().toString().split(":")[1] > "00") {
		// 				timeEntry = self.adjustTime(timeEntry);
		// 				oEvent.getSource().setValue(timeEntry);
		// 			} else {
		// 				//timeEntry = parseFloat(oEvent.getSource().getValue()).toFixed(2);
		// 				timeEntry = self.adjustTime(timeEntry);
		// 				oEvent.getSource().setValue(timeEntry);
		// 			}
		// 			var data = this.getModel('TimeData').getData();
		// 			//var oWorkListModel = this.getModel("Worklist");
		// 			//var aWorkListData = oWorkListModel.getData();
		// 			//var aRow = aWorkListData.find(function (entry, id) {
		// 			//	return entry.WorkListDataFields.POSID === sPosid;
		// 			//});
		// 			var oData = this.getModel("aTableRowsdays").getData();
		// 			var sPosid = this.getModel("aTableRowsdays").getData()[this.iIndex].posid;
		// 			var oWorkListModel = this.getModel("Worklist");
		// 			var aWorkListData = oWorkListModel.getData();
		// 			var aRow = aWorkListData.find(function (entry, id) {
		// 				return entry.WorkListDataFields.POSID === sPosid;
		// 			});
		// 			var oDate = this.getModel("aTableRowsdays").getData()[this.iIndex].rowsdata[this.sIndex].WORKDATE;
		// 			oData[this.iIndex].rowsdata[this.sIndex].CATSHOURS = timeEntry; //parseFloat(oEvent.getSource().getValue()).toFixed(2);
		// 			this.getModel("aTableRowsdays").refresh();
		// 			this.getModel("aTableRowsday").setData(oData[this.iIndex].rowsdata[this.sIndex]);
		// 			var record = data.find(function (entry, id) {
		// 				return that.oFormatyyyymmdd.format(entry.TimeEntryDataFields.WORKDATE) === that.oFormatyyyymmdd
		// 					.format(oDate);
		// 			});
		// 			record.TimeEntryDataFields.CATSHOURS = this.timeToDecimal(timeEntry).toFixed(2);
		// 			// Commented the below line of code as part of CTS-82
		// 			//record.TimeEntryDataFields.CATSHOURS = parseFloat(oEvent.getSource().getValue()).toFixed(2);
		// 			record.TimeEntryDataFields.WrkLoc = this.getModel("aTableRowsdays").getData()[this.iIndex].wrkloc;
		// 			record.TimeEntryDataFields.ProjTimeCat = this.getModel("aTableRowsdays").getData()[this.iIndex].timecat;
		// 			record.TimeEntryDataFields.LSTAR = aRow === undefined ? "" : aRow.WorkListDataFields.LSTAR;

		// 			if (record.Counter) {
		// 				record.TimeEntryOperation = 'U';
		// 			} else {
		// 				record.TimeEntryOperation = 'C';
		// 			}
		// 			this.oControl.setProperty("/overviewCancel", true);
		// 			this.oControl.setProperty("/overviewDataChanged", true);
		// 			this.oControl.setProperty("/isOverviewChanged", true);
		// 			this.oControl.setProperty("/sendForApproval", true);
		// 			this.getModel("TimeData").refresh();
		// 			sap.m.MessageToast.show(that.getResourceBundle().getText("changed"));
		// 		}
		// 	}
		// },
		// onliveChangelongTextItemDetail: function (oEvent) {
		// 	var sValue = oEvent.getParameters("value").value;
		// 	var that = this;
		// 	var data = this.getModel('TimeData').getData();
		// 	var oData = this.getModel("aTableRowsdays").getData();
		// 	var sPosid = this.getModel("aTableRowsdays").getData()[this.iIndex].posid;
		// 	var oDate = this.getModel("aTableRowsdays").getData()[this.iIndex].rowsdata[this.sIndex].WORKDATE;
		// 	if (sValue) {
		// 		oData[this.iIndex].rowsdata[this.sIndex].LONGTEXT_DATA = sValue;
		// 		oData[this.iIndex].rowsdata[this.sIndex].LONGTEXT = "X";
		// 		this.getModel("aTableRowsday").setProperty("/LONGTEXT_DATA", sValue);
		// 	} else {
		// 		oData[this.iIndex].rowsdata[this.sIndex].LONGTEXT_DATA = "";
		// 		oData[this.iIndex].rowsdata[this.sIndex].LONGTEXT = "";
		// 		this.getModel("aTableRowsday").setProperty("/LONGTEXT_DATA", "");
		// 	}
		// 	this.getModel("aTableRowsdays").refresh();
		// 	var record = data.find(function (entry, id) {
		// 		return that.oFormatyyyymmdd.format(entry.TimeEntryDataFields.WORKDATE) === that.oFormatyyyymmdd
		// 			.format(oDate);
		// 	});
		// 	var iActualTime = that.timeToDecimal(oData[this.iIndex].rowsdata[this.sIndex].CATSHOURS);
		// 	if (record.Counter) {
		// 		record.TimeEntryOperation = 'U';
		// 	} else {
		// 		if (iActualTime !== 0) record.TimeEntryOperation = 'C';
		// 	}
		// 	record.TimeEntryDataFields.LONGTEXT_DATA = sValue;
		// 	record.TimeEntryDataFields.LONGTEXT = sValue === "" ? "" : "X";
		// 	this.getModel("TimeData").refresh();
		// 	this.oControl.setProperty("/overviewCancel", true);
		// 	this.oControl.setProperty("/overviewDataChanged", true);
		// 	this.oControl.setProperty("/isOverviewChanged", true);
		// 	this.oControl.setProperty("/sendForApproval", true);
		// 	sap.m.MessageToast.show(that.getResourceBundle().getText("changed"));
		// },
		// onChangereason: function (oEvent) {
		// 	var sValue = oEvent.getParameters().selectedItem.getKey();
		// 	var that = this;
		// 	var data = this.getModel('TimeData').getData();
		// 	var oData = this.getModel("aTableRowsdays").getData();
		// 	var sPosid = this.getModel("aTableRowsdays").getData()[this.iIndex].posid;
		// 	var oDate = this.getModel("aTableRowsdays").getData()[this.iIndex].rowsdata[this.sIndex].WORKDATE;
		// 	if (sValue) {
		// 		oData[this.iIndex].rowsdata[this.sIndex].Chgrs = sValue;
		// 		this.getModel("aTableRowsday").setProperty("/chgrs", sValue);
		// 	} else {
		// 		oData[this.iIndex].rowsdata[this.sIndex].Chgrs = "";
		// 		this.getModel("aTableRowsday").setProperty("/chgrs", "");
		// 	}
		// 	this.getModel("aTableRowsdays").refresh();
		// 	var record = data.find(function (entry, id) {
		// 		return that.oFormatyyyymmdd.format(entry.TimeEntryDataFields.WORKDATE) === that.oFormatyyyymmdd
		// 			.format(oDate);
		// 	});
		// 	var iActualTime = that.timeToDecimal(oData[this.iIndex].rowsdata[this.sIndex].CATSHOURS);
		// 	if (record.Counter) {
		// 		record.TimeEntryOperation = 'U';
		// 	} else {
		// 		if (iActualTime !== 0) record.TimeEntryOperation = 'C';
		// 	}
		// 	record.TimeEntryDataFields.Chgrs = sValue;
		// 	this.getModel("TimeData").refresh();
		// 	this.oControl.setProperty("/overviewCancel", true);
		// 	this.oControl.setProperty("/overviewDataChanged", true);
		// 	this.oControl.setProperty("/isOverviewChanged", true);
		// 	this.oControl.setProperty("/sendForApproval", true);
		// 	sap.m.MessageToast.show(that.getResourceBundle().getText("changed"));
		// },
		// on changing comments/change reason
		onChangeData: function (oEvent) {
			let sId = oEvent.getParameters().id;
			let sValue = "";
			let record, iActualTime;
			let that = this;
			let data = this.getModel('TimeData').getData();
			let oData = this.getModel("aTableRowsdays").getData();
			let sPosid = this.getModel("aTableRowsdays").getData()[this.iIndex].posid;
			let oDate = this.getModel("aTableRowsdays").getData()[this.iIndex].rowsdata[this.sIndex].WORKDATE;
			if (sId.indexOf("idMobChReason") !== -1) {
				sValue = oEvent.getParameters().selectedItem.getKey();
				oData[this.iIndex].rowsdata[this.sIndex].Chgrs = sValue;
				this.getModel("aTableRowsday").setProperty("/chgrs", sValue);
				this.getView().byId("idMobChReason").setValueState('None');
			}
			else {
				sValue = oEvent.getParameters("value").value;
				oData[this.iIndex].rowsdata[this.sIndex].LONGTEXT_DATA = sValue;
				oData[this.iIndex].rowsdata[this.sIndex].LONGTEXT = sValue === "" ? "" : "X";
				this.getModel("aTableRowsday").setProperty("/LONGTEXT_DATA", sValue);
				if (sValue !== '') {
					this.getView().byId("idMobComm").setValueState('None');
				}
			}
			this.getModel("aTableRowsdays").refresh();
			record = data.find(function (entry, id) {
				return that.oFormatyyyymmdd.format(entry.TimeEntryDataFields.WORKDATE) === that.oFormatyyyymmdd
					.format(oDate);
			});
			iActualTime = that.timeToDecimal(oData[this.iIndex].rowsdata[this.sIndex].CATSHOURS);
			if (record.Counter) {
				record.TimeEntryOperation = 'U';
			} else {
				if (iActualTime !== 0) record.TimeEntryOperation = 'C';
			}
			if (sId.indexOf("idMobChReason") !== -1) {
				record.TimeEntryDataFields.Chgrs = sValue;
			}
			else {
				record.TimeEntryDataFields.LONGTEXT_DATA = sValue;
				record.TimeEntryDataFields.LONGTEXT = sValue === "" ? "" : "X";
			}
			this.getModel("TimeData").refresh();
			this.oControl.setProperty("/overviewCancel", true);
			this.oControl.setProperty("/overviewDataChanged", true);
			this.oControl.setProperty("/isOverviewChanged", true);
			this.oControl.setProperty("/sendForApproval", true);
			sap.m.MessageToast.show(that.getResourceBundle().getText("changed"));
		}

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