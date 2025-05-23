sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"cgdc/timesheet/controller/BaseController",
	"cgdc/timesheet/model/formatter",
	'sap/ui/core/Fragment',
	"sap/ui/model/json/JSONModel",
	"sap/m/MessageBox",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator"
], function (Controller, BaseController, formatter, Fragment, JSONModel, MessageBox, Filter, FilterOperator) {
	"use strict";

	return BaseController.extend("cgdc.timesheet.controller.weeksummary", {
		formatter: formatter,
		/**
		 * Called when a controller is instantiated and its View controls (if available) are already created.
		 * Can be used to modify the View before it is displayed, to bind event handlers and do other one-time initialization.
		 * @memberOf cgdc.timesheet.view.detail
		 */
		onInit: function () {
			//this.getOwnerComponent().getRouter().getRoute("weeksummary").attachPatternMatched(this.onRouteMatched, this);
			// var oVizFrame = this.byId("stackedPageBarChart");
			// Bind model and feeds first...
			//this._setVizProperties(oVizFrame);
			// oVizFrame.setVizProperties({
			// 	// as shown above
			// 	title: {
			// 		text: "Weekly Hour Details",
			// 		visible: true
			// 	},
			// 	legendGroup: {
			// 		layout: {
			// 			position: "bottom",  // options: top, bottom, left, right
			// 			width: undefined,        // Avoid fixed width that causes overflow
			// 			height: "auto"
			// 		}
			// 	},
			// 	plotArea: {
			// 		// dataLabel: {
			// 		// 	visible: true,
			// 		// 	formatString: "#,##0"
			// 		// },
			// 		// colorPalette: d3.scale.category20().range(), // optional custom color palette
			// 		drawingEffect: "glossy", // optional: glossy, normal, etc.
			// 		gridline: {
			// 			visible: false
			// 		}
			// 	}
			// });
			this.getView().byId("mobWeeklyWorkList").setVisible(false);
			this.getView().byId("fbTotalHours").setVisible(false);
			this.oBundle = this.getResourceBundle();
			this.daysOfWeek = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
			this.month = ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12"];
			this.oFormatYyyymmdd = sap.ui.core.format.DateFormat.getInstance({
				pattern: "yyyy-MM-dd",
				calendarType: sap.ui.core.CalendarType.Gregorian
			});
			this.oFormatyyyymmdd = sap.ui.core.format.DateFormat.getInstance({
				pattern: "yyyyMMdd",
				calendarType: sap.ui.core.CalendarType.Gregorian
			});
			this.oFormatDate = sap.ui.core.format.DateFormat.getInstance({
				style: "full",
				calendarType: sap.ui.core.CalendarType.Gregorian
			});
			this.oFormatYyyymmddUtc = sap.ui.core.format.DateFormat.getInstance({
				pattern: "yyyy-MM-dd",
				calendarType: sap.ui.core.CalendarType.Gregorian,
				UTC: true
			});
			this.busyDialog = new sap.m.BusyDialog();
			this.oDataModel = this.getOwnerComponent().getModel();

			if (sap.ui.Device.system.phone === true) {
				this.mCalendar = this.byId("calendardateintervalmobile");

				this.getPernrData();
				var curDate = new Date();
				var noOfWeeks = 6;
				var oDate = this.mCalendar.getStartDate();
				this.dateFrom = new Date(curDate.getFullYear(), curDate.getMonth(), curDate.getDate() - this.getActualOffset(0, curDate.getDay()));
				this.dateTo = new Date(this.dateFrom.getFullYear(), this.dateFrom.getMonth(), this.dateFrom.getDate() + noOfWeeks);
				this.startdate = this.getFirstDayOfWeek(new Date(), 0);
				this.enddate = this.getLastDayOfWeek(new Date(), 0);
				//var startdate = this.getFirstDayOfWeek(oDate, 0);
				//var enddate = this.getLastDayOfWeek(oDate, 0);
				this.getTimeEntries(this.startdate, this.enddate);
			}

		},

		onRouteMatched: function () {
			//console.log("Hello W");
		},

		// handleCalendarSelect: function (oEvent) {
		// 	var oCalendar = oEvent.getSource();
		// 	var aSelectedDates = oCalendar.getSelectedDates();
		// 	var oStartDate = this.getFirstDayOfWeek(new Date(aSelectedDates[0].getStartDate()), 'Sunday');
		// 	this.startdate = oStartDate;
		// 	var oEndDate = this.getLastDayOfWeek(new Date(aSelectedDates[0].getStartDate()), 'Sunday');

		// 	// Added to populate the week if the user join in the middle of the week
		// 	if (this.mCalendar.getMinDate() > oStartDate) {
		// 		//var dateStartDate1 = this.getFirstDayOfWeek(this.mCalendar.getStartDate(), oStartDate);
		// 		this.mCalendar.setMinDate(oStartDate);
		// 		this.mCalendar.setStartDate(oStartDate);
		// 	} else {
		// 		this.mCalendar.setStartDate(oStartDate);
		// 	}

		// },

		getPernrData: function () {
			var that = this;
			this.busyDialog.open();
			this.oDataModel.read("/ConcurrentEmploymentSet", {
				success: function (oData) {
					this.busyDialog.close();
					if (oData.results.length === 0) {
						var sResponsivePaddingClasses =
							"sapUiResponsivePadding--header sapUiResponsivePadding--content sapUiResponsivePadding--footer";
						var sText = this.getResourceBundle().getText("notConfig");
						var error = this.getResourceBundle().getText("Error");
						sap.m.MessageBox.confirm(sText, {
							icon: sap.m.MessageBox.Icon.ERROR,
							title: error, // default
							styleClass: sResponsivePaddingClasses, // default
							actions: [sap.m.MessageBox.Action.OK,
							sap.m.MessageBox.Action.CANCEL
							], // default
							emphasizedAction: sap.m.MessageBox.Action.OK // default
						});
						this.mCalendar.setBlocked(true);
						return;
					}
					var aPernrModel = this.getPernrModel();
					aPernrModel.setData(oData.results);
					this.empID = oData.results[0].EmployeeId;

				}.bind(this),
				error: function (oError) {
					this.busyDialog.close();
					this.oErrorHandler.processError(oError);
				}.bind(this)
			});
		},

		getTimeEntries: function (dateFrom, dateTo) {
			var weekStartDate, weekEndDate;
			this.busyDialog.open();
			var that = this;
			var oDate = new Date(this.mCalendar.getStartDate());
			dateFrom = this.getFirstDayOfWeek(oDate, 0);
			var oModel = new sap.ui.model.json.JSONModel();
			var a = new sap.ui.model.Filter({
				path: "StartDate",
				operator: sap.ui.model.FilterOperator.EQ,
				value1: this.oFormatYyyymmdd.format(dateFrom)
			});
			var b = new sap.ui.model.Filter({
				path: "EndDate",
				operator: sap.ui.model.FilterOperator.EQ,
				value1: this.oFormatYyyymmdd.format(dateTo)
			});
			var c = new sap.ui.model.Filter({
				path: "Pernr",
				operator: sap.ui.model.FilterOperator.EQ,
				value1: this.empID
			});
			var f = [];
			f.push(a);
			f.push(b);
			f.push(c);
			var mParameters = {
				filters: f, // your Filter Array
				urlParameters: '$expand=TimeEntries',
				success: function (oData, oResponse) {
					if (oData.results[0].CaleNavMinDate) {
						var oDate2 = new Date(oData.results[0].CaleNavMinDate.getUTCFullYear(), oData.results[0].CaleNavMinDate.getUTCMonth(),
							oData.results[0].CaleNavMinDate.getUTCDate());
						that.minDate = that.getFirstDayOfWeek(oDate2, 0);
					} else {
						that.minDate = oData.results[0].JoiningDate;
					}
					for (var l = 0; l < oData.results.length; l++) {
						oData.results[l]["mindate"] = that.minDate;
						if (oData.results[l].TimeEntries.results.length) {
							for (var m = 0; m < oData.results[l].TimeEntries.results.length; m++) {
								var date1 = oData.results[l].TimeEntries.results[m].TimeEntryDataFields.WORKDATE;
								oData.results[l].TimeEntries.results[m].TimeEntryDataFields.WORKDATE = new Date(date1.getUTCFullYear(), date1.getUTCMonth(),
									date1.getUTCDate());
							}
						}
					}
					that.timeEntries = oData.results;
					that.maxDate = oData.results[0].CaleNavMaxDate;
					oModel.setData(that.timeEntries);
					that.setModel(oModel, "TimeEntries");
					if (that.firstDayOfWeek == undefined) {
						that.firstDayOfWeek = formatter.dayOfWeek("Sunday");
						var curDate = new Date();
						var dateStartDate = that.getFirstDayOfWeek(new Date(), that.firstDayOfWeek);
						var calMinDate = that.oFormatyyyymmdd.format(that.mCalendar.getMinDate());
						// Added this condition inorder to set min date to calendar control if the start date is mid of current week
						if (calMinDate > that.oFormatyyyymmdd.format(dateStartDate)) {
							that.mCalendar.setMinDate(dateStartDate);
							that.mCalendar.setStartDate(dateStartDate);
						} else {
							that.mCalendar.setStartDate(dateStartDate);
						}
						that.startdate = that.getFirstDayOfWeek(new Date(), that.firstDayOfWeek);
						that.enddate = that.getLastDayOfWeek(new Date(), that.firstDayOfWeek);
					}
					else {
						if (that.oFormatyyyymmdd.format(oData.results[0].CaleNavMinDate) > that.oFormatyyyymmdd.format(oData.results[0].JoiningDate)) {
							weekStartDate = that.getFirstDayOfWeek(oData.results[0].CaleNavMinDate, 0);
							weekEndDate = that.getLastDayOfWeek(oData.results[0].CaleNavMaxDate, 0);
							that.mCalendar.setMinDate(weekStartDate);
							// Add this line inorder to load the last week if the max date comes in middle of week
							that.mCalendar.setStartDate(that.startdate);
							// Add this line inorder to load the last week if the max date comes in middle of week
							that.mCalendar.setMaxDate(weekEndDate);
						} else {
							weekStartDate = that.getFirstDayOfWeek(oData.results[0].JoiningDate, 0);
							weekEndDate = that.getLastDayOfWeek(oData.results[0].CaleNavMaxDate, 0);
							that.mCalendar.setMinDate(weekStartDate);
							// Add this line inorder to load the last week if the max date comes in middle of week
							that.mCalendar.setStartDate(that.startdate);
							// Add this line inorder to load the last week if the max date comes in middle of week
							that.mCalendar.setMaxDate(weekEndDate);
						}
					}
					/*var missingDates = $.grep(that.timeEntries, function (element, index) {
						return element.Status == "MISSING";
					});
					var approvedDates = $.grep(that.timeEntries, function (element, index) {
						return element.Status == "DONE";
					});
					var rejectedDates = $.grep(that.timeEntries, function (element, index) {
						return element.Status == "REJECTED";
					});
					var sentDates = $.grep(that.timeEntries, function (element, index) {
						return element.Status == "FORAPPROVAL";
					});
					var draftDates = $.grep(that.timeEntries, function (element, index) {
						return element.Status == "DRAFT";
					});
					var nonWorkDates = $.grep(that.timeEntries, function (element, index) {
						return element.Status == "YACTION";
					});
					var holidayDates = $.grep(that.timeEntries, function (element, index) {
						return element.Status == "HOLIDAY";
					});
					that.mCalendar.removeAllSpecialDates();
					for (var i = 0; i < draftDates.length; i++) {
						var date1 = new Date(draftDates[i].CaleDate.substring(0, 4) + "-" + draftDates[i].CaleDate.substring(4, 6) + "-" +
							draftDates[i].CaleDate.substring(6, 8));
						date1 = new Date(date1.getUTCFullYear(), date1.getUTCMonth(), date1.getUTCDate());
						var date2 = new Date();
						var date2 = new Date(date2.getUTCFullYear(), date2.getUTCMonth(), date2.getUTCDate());
						if (date1 <= date2) {
							that.mCalendar.addSpecialDate(new sap.ui.unified.DateTypeRange({
								startDate: date1,
								type: sap.ui.unified.CalendarDayType.Type01,
								color: "#FFA500",
								tooltip: that.oBundle.getText("timeMissing")
							}));
						} else {
							that.mCalendar.addSpecialDate(new sap.ui.unified.DateTypeRange({
								startDate: date1,
								type: sap.ui.unified.CalendarDayType.Type05,
								color: "#ffffff",
								tooltip: that.oBundle.getText("workingday")
							}));

						}
					}
					for (var i = 0; i < missingDates.length; i++) {
						var date1 = new Date(missingDates[i].CaleDate.substring(0, 4) + "-" + missingDates[i].CaleDate.substring(4, 6) + "-" +
							missingDates[i].CaleDate.substring(6, 8));
						date1 = new Date(date1.getUTCFullYear(), date1.getUTCMonth(), date1.getUTCDate());
						var date2 = new Date();
						var date2 = new Date(date2.getUTCFullYear(), date2.getUTCMonth(), date2.getUTCDate());
						if (date1 <= date2) {
							that.mCalendar.addSpecialDate(new sap.ui.unified.DateTypeRange({
								startDate: date1,
								type: sap.ui.unified.CalendarDayType.Type01,
								color: "#FFA500",
								tooltip: that.oBundle.getText("timeMissing")
							}));
						} else {
							that.mCalendar.addSpecialDate(new sap.ui.unified.DateTypeRange({
								startDate: date1,
								type: sap.ui.unified.CalendarDayType.Type05,
								color: "#ffffff",
								tooltip: that.oBundle.getText("workingday")
							}));
						}
					}
					for (var i = 0; i < sentDates.length; i++) {
						var date1 = new Date(sentDates[i].CaleDate.substring(0, 4) + "-" + sentDates[i].CaleDate.substring(4, 6) + "-" +
							sentDates[i].CaleDate.substring(6, 8));
						date1 = new Date(date1.getUTCFullYear(), date1.getUTCMonth(), date1.getUTCDate());
						that.mCalendar.addSpecialDate(new sap.ui.unified.DateTypeRange({
							startDate: date1,
							type: sap.ui.unified.CalendarDayType.Type04,
							color: "#A7C7E7",
							tooltip: that.oBundle.getText("submitted")
						}));
					}
					for (var i = 0; i < approvedDates.length; i++) {
						var date1 = new Date(approvedDates[i].CaleDate.substring(0, 4) + "-" + approvedDates[i].CaleDate.substring(4, 6) + "-" +
							approvedDates[i].CaleDate.substring(6, 8));
						date1 = new Date(date1.getUTCFullYear(), date1.getUTCMonth(), date1.getUTCDate());
						that.mCalendar.addSpecialDate(new sap.ui.unified.DateTypeRange({
							startDate: date1,
							type: sap.ui.unified.CalendarDayType.Type08,
							color: "#667C26",
							tooltip: that.oBundle.getText("timeCompleted")
						}));
					}
					for (var i = 0; i < rejectedDates.length; i++) {
						var date1 = new Date(rejectedDates[i].CaleDate.substring(0, 4) + "-" + rejectedDates[i].CaleDate.substring(4, 6) + "-" +
							rejectedDates[i].CaleDate.substring(6, 8));
						date1 = new Date(date1.getUTCFullYear(), date1.getUTCMonth(), date1.getUTCDate());
						that.mCalendar.addSpecialDate(new sap.ui.unified.DateTypeRange({
							startDate: date1,
							type: sap.ui.unified.CalendarDayType.Type03,
							color: "#F62217",
							tooltip: that.oBundle.getText("timeRejected")
						}));
					}
					if (sap.ui.unified.CalendarDayType.NonWorking !== undefined) {
						for (var i = 0; i < nonWorkDates.length; i++) {
							var date1 = new Date(nonWorkDates[i].CaleDate.substring(0, 4) + "-" + nonWorkDates[i].CaleDate.substring(4, 6) + "-" +
								nonWorkDates[i].CaleDate.substring(6, 8));
							date1 = new Date(date1.getUTCFullYear(), date1.getUTCMonth(), date1.getUTCDate());
							that.mCalendar.addSpecialDate(new sap.ui.unified.DateTypeRange({
								startDate: date1,
								type: sap.ui.unified.CalendarDayType.NonWorking
							}));
						}
						for (var i = 0; i < holidayDates.length; i++) {
							var date1 = new Date(holidayDates[i].CaleDate.substring(0, 4) + "-" + holidayDates[i].CaleDate.substring(4, 6) + "-" +
								holidayDates[i].CaleDate.substring(6, 8));
							date1 = new Date(date1.getUTCFullYear(), date1.getUTCMonth(), date1.getUTCDate());
							that.mCalendar.addSpecialDate(new sap.ui.unified.DateTypeRange({
								startDate: date1,
								type: sap.ui.unified.CalendarDayType.NonWorking
							}));
						}
					}
					that.setIconOverallStatus(approvedDates, rejectedDates, sentDates, draftDates, missingDates);*/

					that.busyDialog.close();
				},
				error: function (oError) {
					that.busyDialog.close();
					that.oErrorHandler.processError(oError);
				}
			};
			this.oDataModel.read('/WorkCalendarCollection', mParameters);
		},

		handleCalendarSelect: function (oEvent) {
			let date;
			let aFilters = [];
			var oModel = new sap.ui.model.json.JSONModel();
			let oCalendar = oEvent.getSource(),
				oSelectedDate = oCalendar.getSelectedDates()[0],
				oStartDate = oSelectedDate.getStartDate();

			if (oStartDate) {
				date = this.oFormatyyyymmdd.format(oStartDate);
				let oList = this.getView().byId("mobWeeklyWorkList");
				let aTimeEntries = this.getModel("TimeEntries").getData();
				let aSelectDate = aTimeEntries.filter(function (entry, id) {
					return entry.CaleDate === date;
				});
				oModel.setData(aSelectDate[0].TimeEntries.results);
				this.setModel(oModel, "aMobDaySummary");

				// let filter = new Filter("Date", FilterOperator.EQ, date);
				// aFilters.push(filter);
				var total = 0;
				aSelectDate[0].TimeEntries.results.forEach(function (item) {
					total += parseFloat(item.TimeEntryDataFields.CATSHOURS) || 0;
				});

				this.getModel("controls").setProperty("/totalDayHours", total);

				oList.setVisible(true);
				this.getView().byId("fbTotalHours").setVisible(true);
				// let oBinding = oList.getBinding("items");
				// oBinding.filter(aFilters, "Application");
			}

			//MessageBox.show("Date Selected is " + date)
		},

		onStartDateChange: function (oEvent) {
			var that = this;
			var m = oEvent;
			var oCalendar = oEvent.getSource();
			var curDate = new Date();
			curDate = new Date(this.mCalendar.getStartDate());
			this.dateFrom = this.getFirstDayOfWeek(oCalendar.getStartDate(), that.firstDayOfWeek);
			this.dateTo = this.getLastDayOfWeek(oCalendar.getStartDate(), that.firstDayOfWeek);
			this.startdate = this.getFirstDayOfWeek(oCalendar.getStartDate(), that.firstDayOfWeek);
			this.enddate = this.getLastDayOfWeek(oCalendar.getStartDate(), that.firstDayOfWeek);
			this.byId("mobWeeklyWorkList").setVisible(false);
			this.byId("fbTotalHours").setVisible(false);
			// if (this.dateFrom.getTime() < this.getModel("TimeEntries").getData()[0].JoiningDate.getTime()) {
			// 	this.mCalendar.setMinDate(this.dateFrom);
			// 	this.mCalendar.setStartDate(this.dateFrom);
			// }
			//var oItems = this.byId("ENTRY_LIST_CONTENTS").getItems();
			//var oItems1 = this.entryListAbsence.getItems();
			var oControl = this.getModel("controls");
			//var bCopied = oControl.getProperty("/entryCopied");
			//var bChanged = that.getModel("controls").getProperty("/isDataChanged");
			//var bChangedItems = that.getCheckChangedItems();
			// Added as part of Copy Prior Week change in mobile timesheet
			//that.getModel("TimeEntriesCopy")?.setData("");

			//this.getWorkList(new Date(this.dateFrom), new Date(this.dateTo));
			this.getTimeEntries(new Date(this.dateFrom), new Date(this.dateTo));
			//this.initializeTable();
			//this.byId("Add_AdminTime").setEnabled(true);
			//}
		},

		onNavBacktoDetail: function () {
			//var that = this;
			this.Router = this.getOwnerComponent().getRouter();
			this.Router.navTo("default", {});
		}

	});

});