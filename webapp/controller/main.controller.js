sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"cgdc/timesheet/controller/BaseController",
	"sap/ui/model/json/JSONModel",
	"sap/ui/core/routing/History",
	"cgdc/timesheet/model/formatter",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator",
	'sap/m/MessagePopover',
	'sap/m/MessagePopoverItem',
	'sap/m/TablePersoController',
	'sap/m/GroupHeaderListItem',
	'sap/ui/core/Fragment',
	'sap/m/Dialog',
	'sap/m/Text',
	"cgdc/timesheet/util/ReuseFunctions",
	"sap/m/MessageBox",
	"sap/ui/core/syncStyleClass",
	'sap/m/SearchField',
	"sap/ui/model/Sorter"
], function (Controller, BaseController, JSONModel, History, formatter, Filter, FilterOperator, MessagePopover, MessagePopoverItem,
	TablePersoController, GroupHeaderListItem, Fragment, Dialog, Text, ReuseFunctions, MessageBox, syncStyleClass, SearchField, Sorter) {
	"use strict";

	return BaseController.extend("cgdc.timesheet.controller.main", {
		formatter: formatter,

		/**
		 * Called when a controller is instantiated and its View controls (if available) are already created.
		 * Can be used to modify the View before it is displayed, to bind event handlers and do other one-time initialization.
		 * @memberOf cgdc.timesheet.view.main
		 */
		onInit: function () {
			this.entryCopied = false;
			this.daysOfWeek = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
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
			//	this.oCEModel = this.getOwnerComponent().getModel("ce");
			this.oBundle = this.getResourceBundle();
			this.oErrorHandler = this.getOwnerComponent()._oErrorHandler;
			this.initoDataModel(this.oDataModel);
			this.initoBundle(this.oBundle);
			this.initRouter(this.getRouter());
			this.setModel(sap.ui.getCore().getMessageManager().getMessageModel(), "message");
			this.empID = null;
			this.projectTable = this.byId("ENTRY_LIST_CONTENTS");
			this.entryListContents = this.byId("ENTRY_LIST_CONTENTS");
			this.entryListAbsence = this.byId("ENTRY_LIST_ABSENCE");
			this.TotalHrs = this.byId("TOTAL_HOURS");
			this.oTable = this.byId('idOverviewTable');
			this.oTableAdmin = this.byId('idAdminTable');
			this.projectDialogEdit = "";
			this.cellModified = "";
			if (sap.ui.Device.system.phone === true) {
				this.mCalendar = this.byId("calendardateintervalp");
			} else {
				this.mCalendar = this.byId("calendardateinterval"); // calendar dateinterval control
			}
			var data = [];
			var oModel = new JSONModel();
			oModel.setData(data);
			this.updatedRecords = [];
			this.originalTimedata = [];
			this.newRecords = [];
			this.deleteRecords = [];
			var curDate = new Date();
			var noOfWeeks = 6;
			var oDate = this.mCalendar.getStartDate();
			this.dateFrom = new Date(curDate.getFullYear(), curDate.getMonth(), curDate.getDate() - this.getActualOffset(1, curDate.getDay()));
			this.dateTo = new Date(this.dateFrom.getFullYear(), this.dateFrom.getMonth(), this.dateFrom.getDate() + noOfWeeks);
			this.startdate = this.getFirstDayOfWeek(new Date(), 'Monday');
			this.enddate = this.getLastDayOfWeek(new Date(), 'Monday');
			this.getRouter().getRoute("default").attachMatched(this.onRouteMatched, this);

		},
		onRouteMatched: function () {
			this.initializeView();
		},
		initializeView: function () {
			if (!this.getModel("controls").getProperty("/flexContentProjects") || this.getModel("controls").getProperty("/flexContentProjects") ===
				false) {
				this.setControlModel();
				this.getPernrData();
			} else {
				var oDate = new Date(this.mCalendar.getStartDate());
				var startdate = this.getFirstDayOfWeek(oDate, 1);
				var enddate = this.getLastDayOfWeek(oDate, 1);
				this.getWorkList(startdate, enddate);
				this.getTimeEntries(startdate, enddate);
			}
		},
		getCheckChangedItems: function () {
			var bCheck = false;
			var aEntries = this.getModel('TimeData').getData();
			return aEntries.some(function (entry, index) {
				let dataChange = (entry.TimeEntryOperation === "C" || entry.TimeEntryOperation === "D" || entry.TimeEntryOperation === "U");
				return dataChange;
			});
		},
		onBeforeOpenUnifiedCalendar: function (oEvent) {
			this.calendar = oEvent.getSource().getContent()[0];
			this.calendar.destroySelectedDates();
			var curDate = new Date();
			var firstdate = this.calendar.getStartDate();
			firstdate.setMonth(curDate.getMonth() - 1, 1);
			firstdate = this.getFirstDayOfWeek(new Date(firstdate), 'Monday');
			curDate = new Date();
			curDate.setMonth(curDate.getMonth() + 2, 0);
			curDate = this.getLastDayOfWeek(new Date(curDate), 'Monday');
			var lastDate = curDate;
			this.getTimeEntriesMonthCalendar(firstdate, lastDate);
		},
		handleCalendarSelect: function (oEvent) {
			var oCalendar = oEvent.getSource();
			var aSelectedDates = oCalendar.getSelectedDates();
			var oStartDate = this.getFirstDayOfWeek(new Date(aSelectedDates[0].getStartDate()), 'Monday');
			var oEndDate = this.getLastDayOfWeek(new Date(aSelectedDates[0].getStartDate()), 'Monday');
			var oItems = this.byId("ENTRY_LIST_CONTENTS").getItems();
			var bChanged = this.getModel("controls").getProperty("/isDataChanged");
			var bChangedItems = this.getCheckChangedItems();
			//	if (oItems.length) {
			if (bChangedItems) {
				var sText = this.oBundle.getText("unsavedData");
				sap.m.MessageBox.confirm(sText, {
					title: "Confirmation",
					initialFocus: null,
					actions: ["Submit", "Leave Page"],
					onClose: function (oAction) {
						if (oAction === "Submit") {
							this.onSendApproval1();
						} else {
							this.getModel("controls").setProperty("/isDataChanged", false);
							this.mCalendar.setStartDate(oStartDate);
							this.getWorkList(oStartDate, oEndDate);
							this.getTimeEntries(oStartDate, oEndDate);
							this.byId("Add_AdminTime").setEnabled(true);
						}
					}.bind(this)
				});
			} else {
				this.mCalendar.setStartDate(oStartDate);
				this.getWorkList(oStartDate, oEndDate);
				this.getTimeEntries(oStartDate, oEndDate);
				this.byId("Add_AdminTime").setEnabled(true);
			}
		},
		calendarSelection: function (oCalendar, startDate, endDate) {
			oCalendar.destroySelectedDates();
			var selectedDates = new sap.ui.unified.DateRange();
			selectedDates.setStartDate(startDate);
			selectedDates.setEndDate(endDate);
			oCalendar.addSelectedDate(selectedDates);

		},
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
						this.byId("Add_Assignment").setEnabled(false);
						this.byId("Add_AdminTime").setEnabled(false);
						this.byId("idViewMonth").setEnabled(false);
						this.byId("idSave").setEnabled(false);
						this.byId("idSubmit").setEnabled(false);
						this.mCalendar.setBlocked(true);
						return;
					}
					var aPernrModel = this.getPernrModel();
					aPernrModel.setData(oData.results);
					this.empID = oData.results[0].EmployeeId;
					this.getFieldTexts("UNIT");
					this.getAbsenceTypes();
					this.getSwitchInfo();
					new Promise(
						function (fnResolve, fnReject) {
							that.getProfileFields(oData.results[0].EmployeeId);
							that.getWorklistFields(oData.results[0].EmployeeId);
							fnResolve();
							fnReject();
						}
					);
					this.getWorkList(this.dateFrom, this.dateTo);
					this.getTimeEntries(this.dateFrom, this.dateTo);
				}.bind(this),
				error: function (oError) {
					this.busyDialog.close();
					this.oErrorHandler.processError(oError);
				}.bind(this)
			});
		},
		onSaveConfirm1: function (oEvent) {
			this.busyDialog.open();
			//	var bChanged = this.getModel("controls").getProperty("/isDataChanged");
			var bChanged = this.getCheckChangedItemsSaveSubmit();
			if (bChanged) {
				var entries = this.getModel('TimeData').getData();
				for (var i = 0; i < entries.length; i++) {
					entries[i].SetDraft = true;
				}
				for (var j = 0; j < entries.length; j++) {
					// console.log(aEntries[j])
					if (entries[j].Counter && (entries[j].Status === "10" || entries[j].Status === "20" || entries[j].Status === "40" || entries[j].Status ===
							"30") &&
						!entries[j].TimeEntryOperation) {
						entries[j].TimeEntryOperation = "U";
					}
					/*else if (entries[j].Counter && entries[j].Status === "30") {
						entries.splice(j, 1);
						j--;
					}*/
				}
				this.finalSubmit("Save");
			} else {
				var toastMsg = this.getResourceBundle().getText("noDataChanged");
				sap.m.MessageToast.show(toastMsg, {
					//	duration: 3000
				});
				this.busyDialog.close();
				return;
			}
		},
		onSaveConfirm: function (oEvent) {
			this.busyDialog.open();
			var that = this;
			var oItems = this.projectTable.getItems();
			var oItems1 = this.entryListAbsence.getItems();
			var toastMsg;
			//	if (oItems.length) {
			var oControl = this.getModel("controls");
			var bCopied = oControl.getProperty("/entryCopied");
			if (this.checkItems(oItems, "PROJECTTIME") || this.checkItems(oItems1, "ADMINTIME") || bCopied) {
				var entries = this.getModel('TimeData').getData();
				for (var i = 0; i < entries.length; i++) {
					entries[i].SetDraft = true;
				}
				this.finalSubmit();
			} else {
				//	if()
				var entries = this.getModel('TimeData').getData();
				var bEntries = false;
				for (var i = 0; i < entries.length; i++) {
					if (entries[i].Counter && entries[i].TimeEntryOperation === "D") {
						bEntries = true;
						break;
					}
				}
				if (bEntries) {
					this.finalSubmit();
				} else {
					toastMsg = that.getResourceBundle().getText("noDataChanged");
					sap.m.MessageToast.show(toastMsg, {
						//	duration: 3000
					});
					this.busyDialog.close();
					return;
				}

			}
		},
		getSingleItem: function (oCell1, type) {
			var that = this;
			var colhead, coldate, sYear;
			var data = this.getModel('TimeData').getData();
			var clmnAts = that.entryListContents.getColumns();
			var calendarIntervalStartDate = that.mCalendar.getStartDate();
			if (type === "PROJECTTIME") {
				var sTitle = oCell1.getParent().getCells()[1].getText();
			} else {
				sTitle = oCell1.getParent().getCells()[1].getText();
			}
			var iIndex = oCell1.getParent().getCells().indexOf(oCell1);
			colhead = clmnAts[iIndex].getHeader().getItems()[1].getText();
			sYear = clmnAts[iIndex].getHeader().getItems()[2].getText();
			coldate = sYear + "-" + colhead.split("/")[0] + "-" + colhead.split("/")[1];
			var coldate1 = new Date(coldate);
			coldate1 = new Date(coldate1.getUTCFullYear(), coldate1.getUTCMonth(), coldate1.getUTCDate());
			coldate1.setHours(0);
			coldate1.setMinutes(0);
			coldate1.setSeconds(0);
			coldate1.setMilliseconds(0);
			if (type === "PROJECTTIME") {
				var aRow1 = data.find(function (entry, id) {
					return that.oFormatyyyymmdd.format(entry.TimeEntryDataFields.WORKDATE) === that.oFormatyyyymmdd.format(coldate1) &&
						entry.TimeEntryDataFields.POSID === sTitle;
				});
			} else {
				aRow1 = data.find(function (entry, id) {
					return that.oFormatyyyymmdd.format(entry.TimeEntryDataFields.WORKDATE) === that.oFormatyyyymmdd.format(coldate1) &&
						entry.TimeEntryDataFields.AWART === sTitle;
				});
			}
			return aRow1;
		},
		checkItems: function (oItems, type) {
			var bChangeFound = false;
			for (var i = 0; i < oItems.length; i++) {
				var oCells = oItems[i].getAggregation("cells");
				for (var t = 4; t <= (oCells.length) - 1; t++) {
					if (oCells[t].getCustomData()[0].getValue() !== oCells[t].getItems()[0].getValue()) { // value and customdata both are different then change found
						bChangeFound = true;
					} else if (oCells[t].getCustomData()[0].getValue() === oCells[t].getItems()[0].getValue()) { // when copied entry both are same then check on counter and timeentryoperation
						var oItem = this.getSingleItem(oCells[t], type);
						if (oItem) {
							if (oCells[t].getCustomData()[0].getValue()) {
								if (oItem.Counter && oItem.TimeEntryOperation === "U") {
									bChangeFound = true;
								}
							} else {
								if (!oItem.Counter && oItem.TimeEntryOperation === "U") {
									bChangeFound = true;
								}
							}
						}
					}
				}

			}
			return bChangeFound;
		},
		onSendApproval1: function (oEvent) {
			this.busyDialog.open();
			var entries = this.getModel('TimeData').getData();
			//	var bChanged = this.getModel("controls").getProperty("/isDataChanged");
			var bChanged = this.getCheckChangedItemsSaveSubmit();
			if (bChanged) {
				for (var j = 0; j < entries.length; j++) {
					entries[j].SetDraft = false;
				}
				for (var j = 0; j < entries.length; j++) {
					// console.log(aEntries[j])
					if (entries[j].Counter && (entries[j].Status === "10" || entries[j].Status === "20" || entries[j].Status === "40" || entries[j].Status ===
							"30") &&
						!entries[j].TimeEntryOperation) {
						entries[j].TimeEntryOperation = "U";
					}
					/*else if (entries[j].Counter && entries[j].Status === "30") {
						entries.splice(j, 1);
						j--;
					}*/
				}
				this.finalSubmit("Submit");
			} else {
				toastMsg = this.getResourceBundle().getText("noDataChanged");
				sap.m.MessageToast.show(toastMsg, {
					//	duration: 3000
				});
				this.busyDialog.close();
				return;
			}
		},
		onSendApproval: function (oEvent) {
			this.busyDialog.open();
			var that = this;
			var oItems = this.projectTable.getItems();
			var oItems1 = this.entryListAbsence.getItems();
			var toastMsg;
			var oControl = this.getModel("controls");
			var bCopied = oControl.getProperty("/entryCopied");
			if (this.checkItems(oItems, "PROJECTTIME") || this.checkItems(oItems1, "ADMINTIME") || bCopied) {
				var entries = this.getModel('TimeData').getData();
				var array = [];
				for (var j = 0; j < entries.length; j++) {
					if ((entries[j].Counter || entries[j].TimeEntryOperation) && (entries[j].TimeEntryDataFields.STATUS !== "30")) { // consider the non approved entries for sumission
						array.push(entries[j]);
					}
				}
				if (array.length) {
					this.getModel('TimeData').setData(array);
					this.getModel('TimeData').refresh();
				}
				this.finalSubmit();
			} else {
				var entries = this.getModel('TimeData').getData();
				var bEntries = false;
				for (var i = 0; i < entries.length; i++) {
					if (entries[i].Counter && entries[i].TimeEntryDataFields.STATUS === "10") {
						bEntries = true;
						break;
					}
				}
				if (bEntries) {
					for (var j = 0; j < entries.length; j++) {
						entries[j].SetDraft = false;
						if (entries[j].Counter && entries[j].TimeEntryDataFields.STATUS === "10" && entries[j].TimeEntryOperation !== "D") {
							entries[j].TimeEntryOperation = "U";
						} else if (entries[j].Counter && (entries[j].TimeEntryDataFields.STATUS === "20" || entries[j].TimeEntryDataFields.STATUS ===
								"30" ||
								entries[j].TimeEntryDataFields.STATUS === "40")) {
							entries.splice(j, 1);
						}
					}
					this.getModel('TimeData').refresh();
					this.finalSubmit();
				} else {
					toastMsg = that.getResourceBundle().getText("noDataChanged");
					sap.m.MessageToast.show(toastMsg, {
						//	duration: 3000
					});
					this.busyDialog.close();
					return;
				}
			}
			//	}

		},
		performDeleteRowAbs: function (row) {
			var that = this;
			var sText = this.getResourceBundle().getText("deleteConfirm");
			var sConfirmTitle = this.getResourceBundle().getText("confirm");
			var aTableRows = this.getModel("aTableRowsAbs").getData();

			if (row.getCells()[0].getId().includes("__text")) {
				var sTitle1 = row.getCells()[1].getText();
				if (aTableRows.length) {
					var record = aTableRows.find(function (entry, id) {
						return entry.admintype === sTitle1;
					});

					if (record && record.overallWeekStatus === true) {
						MessageBox.information(this.getResourceBundle().getText("approvedEntries2"));
						return;
					}
				}

			}
			var sResponsivePaddingClasses = "sapUiResponsivePadding--header sapUiResponsivePadding--content sapUiResponsivePadding--footer";
			sap.m.MessageBox.confirm(sText, {
				icon: sap.m.MessageBox.Icon.QUESTION,
				title: sConfirmTitle, // default
				styleClass: sResponsivePaddingClasses, // default
				actions: [sap.m.MessageBox.Action.OK,
					sap.m.MessageBox.Action.CANCEL
				], // default
				emphasizedAction: sap.m.MessageBox.Action.OK, // default
				initialFocus: sap.m.MessageBox.Action.CANCEL, // default
				onClose: function (oAction) {
					if (oAction === "OK") {
						that.busyDialog.open();
						var colhead, coldate, bBackendDelete = false,
							sYear;
						var data = that.getModel("TimeData").getData();
						var aggr = row;
						var sTitle;
						if (row.getCells()[0].getId().includes("__text")) {
							sTitle = aggr.getCells()[1].getText();
						} else if (row.getCells()[0].getId().includes("__box")) {
							sTitle = aggr.getCells()[0].getSelectedKey();
							if (!sTitle) {
								that.entryListAbsence.removeItem(row);
								that.calculateHours();
								that.busyDialog.close();
								that.byId("Add_AdminTime").setEnabled(true);
								return;
							}
						}

						var clmnAts = that.entryListAbsence.getColumns();
						var calendarIntervalStartDate = that.mCalendar.getStartDate();
						var oCells = aggr.getCells();
						for (var t = 4; t < (oCells.length) - 1; t++) {
							if (oCells[t].getCustomData()[0].getValue()) {
								bBackendDelete = true;
								break;
							}
						}
						if (bBackendDelete) {
							for (var t = 4; t <= (oCells.length) - 1; t++) {
								if (t === 4) {
									colhead = clmnAts[t].getHeader().getItems()[1].getText();
									sYear = clmnAts[t].getHeader().getItems()[2].getText();
									oCells[t].getItems()[0].setValue("");
								} else if (t === 5) {
									colhead = clmnAts[t].getHeader().getItems()[1].getText();
									sYear = clmnAts[t].getHeader().getItems()[2].getText();
									oCells[t].getItems()[0].setValue("");
								} else if (t === 6) {
									colhead = clmnAts[t].getHeader().getItems()[1].getText();
									sYear = clmnAts[t].getHeader().getItems()[2].getText();
									oCells[t].getItems()[0].setValue("");
								} else if (t === 7) {
									colhead = clmnAts[t].getHeader().getItems()[1].getText();
									sYear = clmnAts[t].getHeader().getItems()[2].getText();
									oCells[t].getItems()[0].setValue("");
								} else if (t === 8) {
									colhead = clmnAts[t].getHeader().getItems()[1].getText();
									sYear = clmnAts[t].getHeader().getItems()[2].getText();
									oCells[t].getItems()[0].setValue("");
								} else if (t === 9) {
									colhead = clmnAts[t].getHeader().getItems()[1].getText();
									sYear = clmnAts[t].getHeader().getItems()[2].getText();
									oCells[t].getItems()[0].setValue("");
								} else if (t === 10) {
									colhead = clmnAts[t].getHeader().getItems()[1].getText();
									sYear = clmnAts[t].getHeader().getItems()[2].getText();
									oCells[t].getItems()[0].setValue("");
								}
								coldate = sYear + "-" + colhead.split("/")[0] + "-" + colhead.split("/")[1];
								var coldate1 = new Date(coldate);
								coldate1 = new Date(coldate1.getUTCFullYear(), coldate1.getUTCMonth(), coldate1.getUTCDate());
								coldate1.setHours(0);
								coldate1.setMinutes(0);
								coldate1.setSeconds(0);
								coldate1.setMilliseconds(0);
								for (var l = 0; l < data.length; l++) {
									if (that.oFormatyyyymmdd.format(data[l].TimeEntryDataFields.WORKDATE) === that.oFormatyyyymmdd.format(coldate1) &&
										data[l].TimeEntryDataFields.AWART === sTitle) {
										data[l].TimeEntryOperation = "D";
										that.getModel("controls").setProperty("/isDataChanged", true);
										break;
									}
								}
								that.getModel("TimeData").refresh();
							}
							that.entryListAbsence.removeItem(row); // enabled to remove item from table and user has to click submit to process the deleted records
							that.calculateHours();
							that.busyDialog.close();
						} else {
							var oCells = aggr.getCells();
							if (row.getCells()[0].getId().includes("__box")) {
								for (var t = 4; t <= (oCells.length) - 1; t++) {
									if (t === 4) {
										colhead = clmnAts[t].getHeader().getItems()[1].getText();
										sYear = clmnAts[t].getHeader().getItems()[2].getText();
										oCells[t].getItems()[0].setValue("");
									} else if (t === 5) {
										colhead = clmnAts[t].getHeader().getItems()[1].getText();
										sYear = clmnAts[t].getHeader().getItems()[2].getText();
										oCells[t].getItems()[0].setValue("");
									} else if (t === 6) {
										colhead = clmnAts[t].getHeader().getItems()[1].getText();
										sYear = clmnAts[t].getHeader().getItems()[2].getText();
										oCells[t].getItems()[0].setValue("");
									} else if (t === 7) {
										colhead = clmnAts[t].getHeader().getItems()[1].getText();
										sYear = clmnAts[t].getHeader().getItems()[2].getText();
										oCells[t].getItems()[0].setValue("");
									} else if (t === 8) {
										colhead = clmnAts[t].getHeader().getItems()[1].getText();
										sYear = clmnAts[t].getHeader().getItems()[2].getText();
										oCells[t].getItems()[0].setValue("");
									} else if (t === 9) {
										colhead = clmnAts[t].getHeader().getItems()[1].getText();
										sYear = clmnAts[t].getHeader().getItems()[2].getText();
										oCells[t].getItems()[0].setValue("");
									} else if (t === 10) {
										colhead = clmnAts[t].getHeader().getItems()[1].getText();
										sYear = clmnAts[t].getHeader().getItems()[2].getText();
										oCells[t].getItems()[0].setValue("");
									}
									coldate = sYear + "-" + colhead.split("/")[0] + "-" + colhead.split("/")[1];
									var coldate1 = new Date(coldate);
									coldate1 = new Date(coldate1.getUTCFullYear(), coldate1.getUTCMonth(), coldate1.getUTCDate());
									coldate1.setHours(0);
									coldate1.setMinutes(0);
									coldate1.setSeconds(0);
									coldate1.setMilliseconds(0);
									for (var l = 0; l < data.length; l++) {
										if (that.oFormatyyyymmdd.format(data[l].TimeEntryDataFields.WORKDATE) === that.oFormatyyyymmdd.format(coldate1) &&
											data[l].TimeEntryDataFields.AWART === sTitle) {
											data.splice(l, 1);
											break;
										}

									}
									that.getModel("TimeData").refresh();

								}
								that.entryListAbsence.removeItem(row);
								that.calculateHours();
								that.busyDialog.close();
								that.byId("Add_AdminTime").setEnabled(true);
							} else {
								for (var t = 4; t <= (oCells.length) - 1; t++) {
									if (t === 4) {
										colhead = clmnAts[t].getHeader().getItems()[1].getText();
										sYear = clmnAts[t].getHeader().getItems()[2].getText();
										oCells[t].getItems()[0].setValue("");
									} else if (t === 5) {
										colhead = clmnAts[t].getHeader().getItems()[1].getText();
										sYear = clmnAts[t].getHeader().getItems()[2].getText();
										oCells[t].getItems()[0].setValue("");
									} else if (t === 6) {
										colhead = clmnAts[t].getHeader().getItems()[1].getText();
										sYear = clmnAts[t].getHeader().getItems()[2].getText();
										oCells[t].getItems()[0].setValue("");
									} else if (t === 7) {
										colhead = clmnAts[t].getHeader().getItems()[1].getText();
										sYear = clmnAts[t].getHeader().getItems()[2].getText();
										oCells[t].getItems()[0].setValue("");
									} else if (t === 8) {
										colhead = clmnAts[t].getHeader().getItems()[1].getText();
										sYear = clmnAts[t].getHeader().getItems()[2].getText();
										oCells[t].getItems()[0].setValue("");
									} else if (t === 9) {
										colhead = clmnAts[t].getHeader().getItems()[1].getText();
										sYear = clmnAts[t].getHeader().getItems()[2].getText();
										oCells[t].getItems()[0].setValue("");
									} else if (t === 10) {
										colhead = clmnAts[t].getHeader().getItems()[1].getText();
										sYear = clmnAts[t].getHeader().getItems()[2].getText();
										oCells[t].getItems()[0].setValue("");
									}
								}
								that.calculateHours();
								that.busyDialog.close();
							}
						}
					}
				}
			});
		},
		performDeleteRowPhone: function (oEvent) {
			var that = this;
			var oTable = this.byId("ENTRY_LIST_CONTENTS_Phone");
			var sPath = oEvent.getSource().getParent().getBindingContextPath();
			var iIndex = parseInt(sPath.split("/")[1]);
			var sPosId = oEvent.getSource().getModel("aTableRows").getObject(sPath).posid;
			var row = oEvent.getSource().getParent();
			var oWorkListModel = this.getModel("aTableRows");
			var aWorkListData = oWorkListModel.getData();
			var aRow = aWorkListData.find(function (entry, id) {
				return entry.posid === sPosId;
			});
			var data = that.getModel("TimeData").getData();
			var sText = this.getResourceBundle().getText("deleteConfirm");
			var sConfirmTitle = this.getResourceBundle().getText("confirm");
			var sResponsivePaddingClasses = "sapUiResponsivePadding--header sapUiResponsivePadding--content sapUiResponsivePadding--footer";
			sap.m.MessageBox.confirm(sText, {
				icon: sap.m.MessageBox.Icon.QUESTION,
				title: sConfirmTitle, // default
				styleClass: sResponsivePaddingClasses, // default
				actions: [sap.m.MessageBox.Action.OK,
					sap.m.MessageBox.Action.CANCEL
				], // default
				emphasizedAction: sap.m.MessageBox.Action.OK, // default
				initialFocus: sap.m.MessageBox.Action.CANCEL, // default
				onClose: function (oAction) {
					if (oAction === "OK") {
						if (aRow) {
							for (var j = 0; j < aRow.rowsdata.length; j++) {
								var aRow1 = data.find(function (entry, id) {
									return entry.TimeEntryDataFields.POSID === sPosId && that.oFormatyyyymmdd.format(entry.TimeEntryDataFields.WORKDATE) ===
										that
										.oFormatyyyymmdd.format(aRow.rowsdata[j].WORKDATE);
								});
								if (aRow1 && aRow1.Counter !== "") {
									aRow1.TimeEntryOperation = "D";

								} else {
									aRow1.TimeEntryOperation = "";
								}

							}
							that.getModel("TimeData").refresh();
						}
						var bBackendDelete = false;
						for (var k = 0; k < data.length; k++) {
							if (data[k].TimeEntryOperation !== "") {
								bBackendDelete = true;
								break;
							}
						}
						if (bBackendDelete) {
							sap.m.MessageToast.show(that.getResourceBundle().getText("removed"));
							that.finalSubmit("COPYENTRYDEL");
						} else {
							for (var j = 0; j < aRow.rowsdata.length; j++) {
								for (var l = 0; l < data.length; l++) {
									if (that.oFormatyyyymmdd.format(data[l].TimeEntryDataFields.WORKDATE) === that.oFormatyyyymmdd.format(aRow.rowsdata[j]
											.WORKDATE) &&
										data[l].TimeEntryDataFields.POSID === sPosId) {
										data.splice(l, 1);
										break;
									}
								}

							}
							aWorkListData.splice(iIndex, 1);
							oWorkListModel.refresh();
							that.getModel("TimeData").refresh();
							that.setPayTotalHours(aWorkListData);
							sap.m.MessageToast.show(that.getResourceBundle().getText("removed"));
							if (oTable.getItems().length === 0) {
								that.getModel("controls").setProperty("/prevWeekBut", true);
								var odata = that.getModel("aTableRows").getData();
								that.setPayTotalHours(odata);
							}

						}

					}
				}
			});

		},
		performDeleteRow: function (row) {
			var that = this;
			var sText = this.getResourceBundle().getText("deleteConfirm");
			var sConfirmTitle = this.getResourceBundle().getText("confirm");
			var aTableRows = this.getModel("aTableRows").getData();
			var sTitle1 = row.getCells()[1].getText();
			if (aTableRows.length) {
				var record = aTableRows.find(function (entry, id) {
					return entry.posid === sTitle1;
				});
				if (record && record.overallWeekStatus === true) {
					MessageBox.information(this.getResourceBundle().getText("approvedEntries1"));
					return;
				}

			}
			var sResponsivePaddingClasses = "sapUiResponsivePadding--header sapUiResponsivePadding--content sapUiResponsivePadding--footer";
			sap.m.MessageBox.confirm(sText, {
				icon: sap.m.MessageBox.Icon.QUESTION,
				title: sConfirmTitle, // default
				styleClass: sResponsivePaddingClasses, // default
				actions: [sap.m.MessageBox.Action.OK,
					sap.m.MessageBox.Action.CANCEL
				], // default
				emphasizedAction: sap.m.MessageBox.Action.OK, // default
				initialFocus: sap.m.MessageBox.Action.CANCEL, // default
				onClose: function (oAction) {
					if (oAction === "OK") {
						var colhead, coldate, bBackendDelete = false,
							sYear;
						var data = that.getModel("TimeData").getData();
						var aggr = row;
						var sTitle = aggr.getCells()[1].getText();
						var clmnAts = that.entryListContents.getColumns();
						var calendarIntervalStartDate = that.mCalendar.getStartDate();
						var oCells = aggr.getCells();
						if (oCells[2].getCustomData()[0].getValue()) {
							bBackendDelete = false;
						} else {
							for (var t = 4; t < (oCells.length) - 1; t++) {
								if (oCells[t].getCustomData()[0].getValue()) {
									bBackendDelete = true;
									break;
								}
							}
						}
						if (bBackendDelete) {
							for (var t = 4; t <= (oCells.length) - 1; t++) {
								if (t === 4) {
									colhead = clmnAts[t].getHeader().getItems()[1].getText();
									sYear = clmnAts[t].getHeader().getItems()[2].getText();
									oCells[t].getItems()[0].setValue("");
								} else if (t === 5) {
									colhead = clmnAts[t].getHeader().getItems()[1].getText();
									sYear = clmnAts[t].getHeader().getItems()[2].getText();
									oCells[t].getItems()[0].setValue("");
								} else if (t === 6) {
									colhead = clmnAts[t].getHeader().getItems()[1].getText();
									sYear = clmnAts[t].getHeader().getItems()[2].getText();
									oCells[t].getItems()[0].setValue("");
								} else if (t === 7) {
									colhead = clmnAts[t].getHeader().getItems()[1].getText();
									sYear = clmnAts[t].getHeader().getItems()[2].getText();
									oCells[t].getItems()[0].setValue("");
								} else if (t === 8) {
									colhead = clmnAts[t].getHeader().getItems()[1].getText();
									sYear = clmnAts[t].getHeader().getItems()[2].getText();
									oCells[t].getItems()[0].setValue("");
								} else if (t === 9) {
									colhead = clmnAts[t].getHeader().getItems()[1].getText();
									sYear = clmnAts[t].getHeader().getItems()[2].getText();
									oCells[t].getItems()[0].setValue("");
								} else if (t === 10) {
									colhead = clmnAts[t].getHeader().getItems()[1].getText();
									sYear = clmnAts[t].getHeader().getItems()[2].getText();
									oCells[t].getItems()[0].setValue("");
								}
								coldate = sYear + "-" + colhead.split("/")[0] + "-" + colhead.split("/")[1];
								var coldate1 = new Date(coldate);
								coldate1 = new Date(coldate1.getUTCFullYear(), coldate1.getUTCMonth(), coldate1.getUTCDate());
								coldate1.setHours(0);
								coldate1.setMinutes(0);
								coldate1.setSeconds(0);
								coldate1.setMilliseconds(0);
								for (var l = 0; l < data.length; l++) {
									if (that.oFormatyyyymmdd.format(data[l].TimeEntryDataFields.WORKDATE) === that.oFormatyyyymmdd.format(coldate1) &&
										data[l].TimeEntryDataFields.POSID === sTitle && data[l].TimeEntryDataFields.STATUS !== "30") {
										data[l].TimeEntryOperation = "D";
										that.getModel("controls").setProperty("/isDataChanged", true);
										break;
									}
								}
								that.getModel("TimeData").refresh();
							}
							that.projectTable.removeItem(row); // enabled to remove item from table and user has to click submit to process the deleted records
							that.calculateHours();
						} else {
							var oCells = aggr.getCells();
							for (var t = 4; t <= (oCells.length) - 1; t++) {
								if (t === 4) {
									colhead = clmnAts[t].getHeader().getItems()[1].getText();
									sYear = clmnAts[t].getHeader().getItems()[2].getText();
								} else if (t === 5) {
									colhead = clmnAts[t].getHeader().getItems()[1].getText();
									sYear = clmnAts[t].getHeader().getItems()[2].getText();
								} else if (t === 6) {
									colhead = clmnAts[t].getHeader().getItems()[1].getText();
									sYear = clmnAts[t].getHeader().getItems()[2].getText();
								} else if (t === 7) {
									colhead = clmnAts[t].getHeader().getItems()[1].getText();
									sYear = clmnAts[t].getHeader().getItems()[2].getText();
								} else if (t === 8) {
									colhead = clmnAts[t].getHeader().getItems()[1].getText();
									sYear = clmnAts[t].getHeader().getItems()[2].getText();
								} else if (t === 9) {
									colhead = clmnAts[t].getHeader().getItems()[1].getText();
									sYear = clmnAts[t].getHeader().getItems()[2].getText();
								} else if (t === 10) {
									colhead = clmnAts[t].getHeader().getItems()[1].getText();
									sYear = clmnAts[t].getHeader().getItems()[2].getText();
								}
								coldate = sYear + "-" + colhead.split("/")[0] + "-" + colhead.split("/")[1];
								var coldate1 = new Date(coldate);
								coldate1 = new Date(coldate1.getUTCFullYear(), coldate1.getUTCMonth(), coldate1.getUTCDate());
								coldate1.setHours(0);
								coldate1.setMinutes(0);
								coldate1.setSeconds(0);
								coldate1.setMilliseconds(0);
								for (var l = 0; l < data.length; l++) {
									if (that.oFormatyyyymmdd.format(data[l].TimeEntryDataFields.WORKDATE) === that.oFormatyyyymmdd.format(coldate1) &&
										data[l].TimeEntryDataFields.POSID === sTitle) {
										data.splice(l, 1);
										break;
									}

								}
								that.getModel("TimeData").refresh();
							}
							that.projectTable.removeItem(row);
							that.calculateHours();
							if (that.projectTable.getItems().length === 0) {
								that.getModel("controls").setProperty("/prevWeekBut", true);
							}
							that.busyDialog.close();
						}
					}
				}
			});
		},
		removeProjectTableItems: function () {
			var that = this;
			var data = that.getModel("TimeData").getData();
			var colhead, coldate, bBackendDelete = false,
				sYear;
			var oItems = this.projectTable.getItems();
			var clmnAts = this.projectTable.getColumns();
			for (var i = 0; i < oItems.length; i++) {
				var oCells = oItems[i].getCells();
				for (var t = 4; t <= (oCells.length) - 1; t++) {
					var sTitle = oItems[i].getCells()[1].getText();
					if (t === 4) {
						colhead = clmnAts[t].getHeader().getItems()[1].getText();
						sYear = clmnAts[t].getHeader().getItems()[2].getText();
					} else if (t === 5) {
						colhead = clmnAts[t].getHeader().getItems()[1].getText();
						sYear = clmnAts[t].getHeader().getItems()[2].getText();
					} else if (t === 6) {
						colhead = clmnAts[t].getHeader().getItems()[1].getText();
						sYear = clmnAts[t].getHeader().getItems()[2].getText();
					} else if (t === 7) {
						colhead = clmnAts[t].getHeader().getItems()[1].getText();
						sYear = clmnAts[t].getHeader().getItems()[2].getText();
					} else if (t === 8) {
						colhead = clmnAts[t].getHeader().getItems()[1].getText();
						sYear = clmnAts[t].getHeader().getItems()[2].getText();
					} else if (t === 9) {
						colhead = clmnAts[t].getHeader().getItems()[1].getText();
						sYear = clmnAts[t].getHeader().getItems()[2].getText();
					} else if (t === 10) {
						colhead = clmnAts[t].getHeader().getItems()[1].getText();
						sYear = clmnAts[t].getHeader().getItems()[2].getText();
					}
					coldate = sYear + "-" + colhead.split("/")[0] + "-" + colhead.split("/")[1];
					var coldate1 = new Date(coldate);
					coldate1 = new Date(coldate1.getUTCFullYear(), coldate1.getUTCMonth(), coldate1.getUTCDate());
					coldate1.setHours(0);
					coldate1.setMinutes(0);
					coldate1.setSeconds(0);
					coldate1.setMilliseconds(0);
					for (var l = 0; l < data.length; l++) {
						if (that.oFormatyyyymmdd.format(data[l].TimeEntryDataFields.WORKDATE) === that.oFormatyyyymmdd.format(coldate1) &&
							data[l].TimeEntryDataFields.POSID === sTitle) {
							data.splice(l, 1);
							break;
						}
					}
					that.getModel("TimeData").refresh();
				}
				that.projectTable.removeItem(oItems[i]);
			}
		},
		handleMessagePopover: function (oEvent) {
			var oMessageTemplate = new MessagePopoverItem({
				type: '{message>severity}',
				description: "{message>description}",
				title: '{message>message}',
			});
			var oMessagePopover = new MessagePopover({
				items: {
					path: "message>/",
					template: oMessageTemplate
				}
			});
			this.oMessagePopover = oMessagePopover;
			this.oMessagePopover.setModel(sap.ui.getCore().getMessageManager().getMessageModel(), "message");
			this.oMessagePopover.toggle(oEvent.getSource());

		},
		onClickFocusError: function (oEvent) {
			var that = this;
			var oRecRowNo = oEvent.getSource().getCustomData("counter")[0].getValue();
			var dataModel = oEvent.getSource().getCustomData("code")[1].getValue();
			var oEntries = this.getModel(dataModel).getData();
			var highlightedRecords = $.grep(oEntries, function (element, ind) {
				if (element.valueState) {
					return element.valueState === "Error";
				}
			});
			for (var i = 0; i < highlightedRecords.length; i++) {
				highlightedRecords[i].valueState = "None";
			}
			this.getModel('TimeData').updateBindings();
			var entry = $.grep(oEntries, function (element, ind) {
				if (element.RecRowNo) {
					return element.RecRowNo === parseInt(oRecRowNo).toString();
				}
			});
			if (entry.length > 0) {
				entry[0].valueState = "Error";
			}
			this.getModel('TimeData').updateBindings();
			this.oMessagePopover.close();
		},
		fetchRecordsPhone: function (oRelease) {
			var timeEntries = [];
			var deleteRecords = this.getModel('deleteRecords').getData();
			var entries = this.getModel('TimeData').getData();
			var newRecords = $.grep(entries, function (element, index) {
				return element.TimeEntryOperation == 'C';
			});
			var changedRecords = $.grep(entries, function (element, index) {
				return element.TimeEntryOperation == 'U';
			});
			var selectedRecords = $.grep(entries, function (element, index) {
				return element.TimeEntryOperation == 'R';
			});

			for (var i = 0; i < changedRecords.length; i++) {
				changedRecords[i].TimeEntryOperation = 'U';
				if (changedRecords[i].SetDraft) {
					changedRecords[i].AllowRelease = '';
					// delete changedRecords[i].SetDraft;
				} else {
					changedRecords[i].AllowRelease = 'X';
					// delete changedRecords[i].SetDraft;
				}
			}
			for (var i = 0; i < newRecords.length; i++) {
				newRecords[i].TimeEntryOperation = 'C';
				if (newRecords[i].SetDraft) {
					newRecords[i].AllowRelease = '';
					// delete newRecords[i].SetDraft;
				} else {
					newRecords[i].AllowRelease = 'X';
					// delete newRecords[i].SetDraft;
				}
			}
			for (var i = 0; i < deleteRecords.length; i++) {

				deleteRecords[i].TimeEntryOperation = 'D';

				if (deleteRecords[i].SetDraft) {
					deleteRecords[i].AllowRelease = '';
					// delete deleteRecords[i].SetDraft;
				} else {
					deleteRecords[i].AllowRelease = 'X';
					// delete deleteRecords[i].SetDraft;
				}
			}
			if (deleteRecords.length > 0) {
				for (var i = 0; i < deleteRecords.length; i++) {
					timeEntries.push(deleteRecords[i]);
				}

			}
			if (changedRecords.length > 0) {
				for (var i = 0; i < changedRecords.length; i++) {
					timeEntries.push(changedRecords[i]);
				}
			}
			if (newRecords.length > 0) {
				for (var i = 0; i < newRecords.length; i++) {
					timeEntries.push(newRecords[i]);
				}
			}
			// }
			for (var i = 0; i < timeEntries.length; i++) {
				timeEntries[i].RecRowNo = (i + 1).toString();
				if (timeEntries[i].TimeEntryDataFields.CATSHOURS === "") {
					timeEntries[i].TimeEntryDataFields.CATSHOURS = "0.00";
				}
			}
			var copiedEntries = $.extend(true, [], timeEntries);
			for (var i = 0; i < copiedEntries.length; i++) {
				copiedEntries[i].AssignmentId = "";
				copiedEntries[i].AssignmentName = "";
				delete copiedEntries[i].target;
				delete copiedEntries[i].totalHours;
				delete copiedEntries[i].addButton;
				delete copiedEntries[i].addButtonEnable;
				delete copiedEntries[i].deleteButtonEnable;
				delete copiedEntries[i].deleteButton;
				delete copiedEntries[i].TimeEntryDataFields.ERSDA;
				delete copiedEntries[i].TimeEntryDataFields.LAEDA;
				delete copiedEntries[i].TimeEntryDataFields.LAETM;
				delete copiedEntries[i].TimeEntryDataFields.ERSTM;
				delete copiedEntries[i].TimeEntryDataFields.APDAT;
				delete copiedEntries[i].HeaderData;
				delete copiedEntries[i].highlight;
				delete copiedEntries[i].SetDraft;
				delete copiedEntries[i].valueStateText;
				delete copiedEntries[i].valueState;
				copiedEntries[i].TimeEntryDataFields.WORKDATE = this.formatter.formatToBackendString(copiedEntries[i].TimeEntryDataFields.WORKDATE) +
					"T00:00:00";
				copiedEntries[i].TimeEntryDataFields.CATSHOURS = parseFloat(copiedEntries[i].TimeEntryDataFields.CATSHOURS).toFixed(2);
			}
			return copiedEntries;
		},
		initializeTableHrs: function () {
			this.TotalHrs.destroyColumns();
			this.TotalHrs.removeAllItems();
			var startDate = this.mCalendar.getStartDate();
			var firstday = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate() - this.getActualOffset(1, startDate.getDay()));
			var firstday1 = this.getFirstDayOfWeek(startDate, 'Monday');
			var h = new sap.m.Column({
				hAlign: "Left",
				demandPopin: false,
				minScreenWidth: "",
				width: "18.2rem",
				header: new sap.m.Label({
					design: "Bold",
					text: this.oBundle.getText("summary"),
					visible: false
				}),
			});
			this.TotalHrs.addColumn(h);

			h = new sap.m.Column({
				hAlign: "Center",
				demandPopin: false,
				width: "3rem",
				header: new sap.m.Label({
					design: "Bold",
					text: "Total",
					visible: false
				})
			});
			this.TotalHrs.addColumn(h);

			for (var i = 0; i < 7; i++) {
				var nextDay = firstday;
				var nextDate = this.formatDateMMMDD(nextDay);

				var dateStr = nextDay.getDate();
				var length = dateStr.toString().length;
				if (length === 1) {
					dateStr = "0" + dateStr;
				}
				var n = this.month[nextDay.getMonth()] + "/" + dateStr;
				var sYear = nextDay.getFullYear();
				h = new sap.m.Column({
					hAlign: "Center",
					width: "3.5rem",
					demandPopin: true,
					minScreenWidth: "Tablet",
					popinDisplay: "Inline",
					header: new sap.m.VBox({
						items: [
							new sap.m.Label({
								design: "Standard",
								text: this.daysOfWeek[i]
							}),
							new sap.m.Label({
								design: "Standard",
								text: n
							}),
							//year
							new sap.m.Label({
								visible: false,
								design: "Standard",
								text: sYear
							})
						],
						visible: false
					})
				});
				this.TotalHrs.addColumn(h);
				nextDay.setDate(firstday.getDate() + 1);
			}
		},
		initializeTableAbsence: function () {
			this.entryListAbsence.destroyColumns();
			this.entryListAbsence.removeAllItems();
			var startDate = this.mCalendar.getStartDate();
			var firstday = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate() - this.getActualOffset(1, startDate.getDay()));
			var firstday1 = this.getFirstDayOfWeek(startDate, 'Monday');
			var h = new sap.m.Column({
				hAlign: "Left",
				demandPopin: false,
				minScreenWidth: "",
				width: "17rem",
				header: new sap.m.Label({
					design: "Bold",
					text: "Absence",
					visible: false
				}),
				footer: new sap.m.Label({
					design: "Bold",
					text: ""
				})
			});
			this.entryListAbsence.addColumn(h);
			h = new sap.m.Column({
				hAlign: "Left",
				width: "1rem",
				visible: false,
				header: new sap.m.Label({})
			});
			this.entryListAbsence.addColumn(h);
			//	Blank column header for Copy/Delete Icons-Buttons
			h = new sap.m.Column({
				hAlign: "Left",
				width: "1rem",
				header: new sap.m.Label({
					visible: false
				})
			});
			this.entryListAbsence.addColumn(h);
			h = new sap.m.Column({
				hAlign: "Center",
				demandPopin: false,
				width: "3rem",
				header: new sap.m.Label({
					design: "Bold",
					text: "Total",
					visible: false
				}),
				footer: new sap.m.Label({
					text: "00:00"
				})
			});
			this.entryListAbsence.addColumn(h);

			for (var i = 0; i < 7; i++) {
				var nextDay = firstday;
				var nextDate = this.formatDateMMMDD(nextDay);

				var dateStr = nextDay.getDate();
				var length = dateStr.toString().length;
				if (length === 1) {
					dateStr = "0" + dateStr;
				}
				var n = this.month[nextDay.getMonth()] + "/" + dateStr;
				var sYear = nextDay.getFullYear();
				h = new sap.m.Column({
					hAlign: "Center",
					width: "3.5rem",
					demandPopin: true,
					minScreenWidth: "Tablet",
					popinDisplay: "Inline",
					header: new sap.m.VBox({
						items: [
							new sap.m.Label({
								design: "Standard",
								text: this.daysOfWeek[i]
							}),
							new sap.m.Label({
								design: "Standard",
								text: n
							}),
							//year
							new sap.m.Label({
								visible: false,
								design: "Standard",
								text: sYear
							})
						],
						visible: false
					}),
					footer: new sap.m.Label({
						text: "00:00"
					})
				});
				this.entryListAbsence.addColumn(h);
				nextDay.setDate(firstday.getDate() + 1);
			}

		},
		initializeTable: function () {
			this.projectTable.destroyColumns();
			this.projectTable.removeAllItems();
			var startDate = this.mCalendar.getStartDate();
			var firstday = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate() - this.getActualOffset(1, startDate.getDay()));
			var firstday1 = this.getFirstDayOfWeek(startDate, 'Monday');
			this.entryListContents = this.byId("ENTRY_LIST_CONTENTS");
			var h = new sap.m.Column({
				demandPopin: false,
				minScreenWidth: "",
				width: "17rem",
				header: new sap.m.Label({
					design: "Bold",
					text: "{i18n>cost_assignment}",
				}),
				footer: new sap.m.Label({})
			});
			this.entryListContents.addColumn(h);
			h = new sap.m.Column({
				hAlign: "Center",
				visible: false,
				demandPopin: false,
			});
			this.entryListContents.addColumn(h);
			//	Blank column header for Copy/Delete Icons-Buttons
			h = new sap.m.Column({
				hAlign: "Left",
				width: "1rem",
				header: new sap.m.Label({})
			});
			this.entryListContents.addColumn(h);

			h = new sap.m.Column({
				hAlign: "Center",
				demandPopin: false,
				width: "3rem",
				header: new sap.m.Label({
					design: "Bold",
					text: "Total",
				}),
				footer: new sap.m.Label({
					text: "00:00"
				})
			});
			this.entryListContents.addColumn(h);

			for (var i = 0; i < 7; i++) {
				var nextDay = firstday;
				var nextDate = this.formatDateMMMDD(nextDay);

				var dateStr = nextDay.getDate();
				var length = dateStr.toString().length;
				if (length === 1) {
					dateStr = "0" + dateStr;
				}
				var n = this.month[nextDay.getMonth()] + "/" + dateStr;
				var sYear = nextDay.getFullYear();
				h = new sap.m.Column({
					hAlign: "Center",
					width: "3.5rem",
					demandPopin: true,
					minScreenWidth: "Tablet",
					popinDisplay: "Inline",
					header: new sap.m.VBox({
						items: [
							new sap.m.Label({
								design: "Standard",
								text: this.daysOfWeek[i]
							}),
							new sap.m.Label({
								design: "Standard",
								text: n
							}),
							//year
							new sap.m.Label({
								visible: false,
								design: "Standard",
								text: sYear
							})
						],
					}),
					footer: new sap.m.Label({
						text: "00:00"
					})
				});
				this.entryListContents.addColumn(h);
				nextDay.setDate(firstday.getDate() + 1);
			}
		},
		validateAllCellErrors: function () {
			var oTableRef = this.byId("ENTRY_LIST_CONTENTS");
			var hasValError = this.validateTableError(oTableRef);
			return hasValError;
		},
		validateTableError: function (oTableRef) {
			var selectedItems = [];
			selectedItems = oTableRef.getItems();
			var hasValError = false;

			for (var aCnt = 0; aCnt < selectedItems.length; aCnt++) {
				var cells = selectedItems[aCnt].getAggregation("cells");
				for (var c = 0; c < cells.length; c++) {
					hasValError = cells[c].data().hasValidationErr;

					if (hasValError) {
						return hasValError;
					}
				}
			}
			return hasValError;
		},
		updateTimeEntriesModelFromAbsTable: function (cell) {
			var that = this;
			var colhead, coldate, sYear;
			var data = this.getModel("TimeData").getData();
			var aggr = this.entryListAbsence.getItems();
			var clmnAts = this.entryListAbsence.getColumns();
			var calendarIntervalStartDate = this.mCalendar.getStartDate();
			var sAdminTimeKey = "";
			if (cell.getParent().getParent().getCells()[0].getId().includes("__text")) {
				sAdminTimeKey = cell.getParent().getParent().getCells()[1].getText();
			} else {
				sAdminTimeKey = cell.getParent().getParent().getCells()[0].getSelectedKey();
			}
			var oCells = cell.getParent().getParent().getAggregation("cells");
			var cellindex = cell.getParent().getParent().indexOfCell(cell.getParent());
			for (var t = cellindex; t <= (oCells.length) - 1; t++) {
				var val = oCells[t].getItems()[0].getValue();
				if (t === 3) {
					colhead = clmnAts[t].getHeader().getItems()[1].getText();
					sYear = clmnAts[t].getHeader().getItems()[2].getText();
					break;
				} else if (t === 4) {
					colhead = clmnAts[t].getHeader().getItems()[1].getText();
					sYear = clmnAts[t].getHeader().getItems()[2].getText();
					break;
				} else if (t === 5) {
					colhead = clmnAts[t].getHeader().getItems()[1].getText();
					sYear = clmnAts[t].getHeader().getItems()[2].getText();
					break;
				} else if (t === 6) {
					colhead = clmnAts[t].getHeader().getItems()[1].getText();
					sYear = clmnAts[t].getHeader().getItems()[2].getText();
					break;
				} else if (t === 7) {
					colhead = clmnAts[t].getHeader().getItems()[1].getText();
					sYear = clmnAts[t].getHeader().getItems()[2].getText();
					break;
				} else if (t === 8) {
					colhead = clmnAts[t].getHeader().getItems()[1].getText();
					sYear = clmnAts[t].getHeader().getItems()[2].getText();
					break;
				} else if (t === 9) {
					colhead = clmnAts[t].getHeader().getItems()[1].getText();
					sYear = clmnAts[t].getHeader().getItems()[2].getText();
					break;
				} else if (t === 10) {
					colhead = clmnAts[t].getHeader().getItems()[1].getText();
					sYear = clmnAts[t].getHeader().getItems()[2].getText();
					break;
				}
			}
			coldate = sYear + "-" + colhead.split("/")[0] + "-" + colhead.split("/")[1];

			var coldate1 = new Date(coldate);
			coldate1 = new Date(coldate1.getUTCFullYear(), coldate1.getUTCMonth(), coldate1.getUTCDate());
			coldate1.setHours(0);
			coldate1.setMinutes(0);
			coldate1.setSeconds(0);
			coldate1.setMilliseconds(0);
			var daterecords = $.grep(data, function (element, index) {
				var date = element.TimeEntryDataFields.WORKDATE;
				return that.oFormatyyyymmdd.format(date) == that.oFormatyyyymmdd.format(coldate1) && element.TimeEntryDataFields.AWART ===
					sAdminTimeKey;
			});
			var sValue = cell.getValue();
			var iNum;
			var sValue1 = parseInt(sValue.split(":")[0]);
			var sValue2 = sValue.split(":")[1];
			if (sValue1) {
				if (sValue2) {
					if (sValue1 <= 9) {
						iNum = sValue1 + ":" + sValue2;
					} else {
						iNum = sValue;
					}
				} else {
					iNum = sValue1 + ":00";
				}
			} else {
				if (sValue2) {
					iNum = "00:" + sValue2;
				} else {
					iNum = "0:00";
				}
			}
			if (daterecords.length) {
				var sActualTime = this.timeToDecimal(sValue);
				if (sActualTime === 0) {
					if (daterecords[0].Counter) {
						// Commenting this condition to accept 0 hours when the status of time entry is approved
						//if (daterecords[0].TimeEntryDataFields.STATUS !== "30") {
						daterecords[0].TimeEntryOperation = "D";
						daterecords[0].TimeEntryDataFields.CATSHOURS = sActualTime.toFixed(2);
						//}
						// Commenting this condition to accept 0 hours when the status of time entry is approved
					} else {
						daterecords[0].TimeEntryDataFields.CATSHOURS = sActualTime.toFixed(2);
						daterecords[0].TimeEntryOperation = "C";
					}
				} else {
					daterecords[0].TimeEntryDataFields.CATSHOURS = sActualTime.toFixed(2);
					if (daterecords[0].Counter) {
						daterecords[0].TimeEntryOperation = "U";
					} else {
						daterecords[0].TimeEntryOperation = "C";
					}
				}

				daterecords[0].TimeEntryDataFields.AWART = sAdminTimeKey;
				this.getModel("TimeData").refresh();
				this.getModel("controls").setProperty("/isDataChanged", true);
			}
		},
		updateTimeEntriesModel: function (cell) {
			var colhead, coldate, sYear;
			var data = this.getModel("TimeData").getData();
			var aggr = this.entryListContents.getItems();
			var clmnAts = this.entryListContents.getColumns();
			var calendarIntervalStartDate = this.mCalendar.getStartDate();
			var sPosid = cell.getParent().getParent().getCells()[1].getText();
			var oWorkListModel = this.getModel("Worklist");
			var aWorkListData = oWorkListModel.getData();
			var aRow = aWorkListData.find(function (entry, id) {
				return entry.WorkListDataFields.POSID === sPosid;
			});
			var oCells = cell.getParent().getParent().getAggregation("cells");
			var cellindex = cell.getParent().getParent().indexOfCell(cell.getParent());
			for (var t = cellindex; t <= (oCells.length) - 1; t++) {
				var val = oCells[t].getItems()[0].getValue();
				if (t === 4) {
					colhead = clmnAts[t].getHeader().getItems()[1].getText();
					sYear = clmnAts[t].getHeader().getItems()[2].getText();
					break;
				} else if (t === 5) {
					colhead = clmnAts[t].getHeader().getItems()[1].getText();
					sYear = clmnAts[t].getHeader().getItems()[2].getText();
					break;
				} else if (t === 6) {
					colhead = clmnAts[t].getHeader().getItems()[1].getText();
					sYear = clmnAts[t].getHeader().getItems()[2].getText();
					break;
				} else if (t === 7) {
					colhead = clmnAts[t].getHeader().getItems()[1].getText();
					sYear = clmnAts[t].getHeader().getItems()[2].getText();
					break;
				} else if (t === 8) {
					colhead = clmnAts[t].getHeader().getItems()[1].getText();
					sYear = clmnAts[t].getHeader().getItems()[2].getText();
					break;
				} else if (t === 9) {
					colhead = clmnAts[t].getHeader().getItems()[1].getText();
					sYear = clmnAts[t].getHeader().getItems()[2].getText();
					break;
				} else if (t === 10) {
					colhead = clmnAts[t].getHeader().getItems()[1].getText();
					sYear = clmnAts[t].getHeader().getItems()[2].getText();
					break;
				}
			}
			coldate = sYear + "-" + colhead.split("/")[0] + "-" + colhead.split("/")[1];
			var coldate1 = new Date(coldate);
			coldate1 = new Date(coldate1.getUTCFullYear(), coldate1.getUTCMonth(), coldate1.getUTCDate());
			coldate1.setHours(0);
			coldate1.setMinutes(0);
			coldate1.setSeconds(0);
			coldate1.setMilliseconds(0);
			for (var l = 0; l < data.length; l++) {
				if (this.oFormatyyyymmdd.format(data[l].TimeEntryDataFields.WORKDATE) === this.oFormatyyyymmdd.format(coldate1) &&
					data[l].TimeEntryDataFields.POSID === sPosid) {
					var record = data[l];
					break;
				}
			}
			var sValue = cell.getValue();
			var iNum;
			var sValue1 = parseInt(sValue.split(":")[0]);
			var sValue2 = sValue.split(":")[1];
			if (sValue1) {
				if (sValue2) {
					if (sValue1 <= 9) {
						iNum = sValue1 + ":" + sValue2;
					} else {
						iNum = sValue;
					}
				} else {
					iNum = sValue1 + ":00";
				}
			} else {
				if (sValue2) {
					iNum = "00:" + sValue2;
				} else {
					iNum = "0:00";
				}
			}
			var oWorklistModelData = this.getModel("WorklistFields").getData();
			var aRow1 = oWorklistModelData.find(function (entry, id) {
				return entry.POSID === sPosid;
			});
			// delete single day entry when time is zero or NAN for non approved entry(only backend entry)
			var sActualTime = this.timeToDecimal(sValue);
			if (sActualTime === 0) {
				if (record.Counter) {
					// Commenting this condition to accept 0 hours when the status of time entry is approved
					//if (record.TimeEntryDataFields.STATUS !== "30") {
					record.TimeEntryOperation = "D";
					record.TimeEntryDataFields.CATSHOURS = sActualTime.toFixed(2);
					//}
					// Commenting this condition to accept 0 hours when the status of time entry is approved
				} else {
					record.TimeEntryDataFields.CATSHOURS = sActualTime.toFixed(2);
					record.TimeEntryOperation = "C";
				}
			} else {
				record.TimeEntryDataFields.CATSHOURS = sActualTime.toFixed(2);
				if (record.Counter) {
					record.TimeEntryOperation = "U";
				} else {
					record.TimeEntryOperation = "C";
				}
			}
			record.TimeEntryDataFields.AWART = "WRK";
			if (aRow) {
				record.TimeEntryDataFields.AWART = aRow.WorkListDataFields.ZAWART;
				// Added condition as part of LSTNR value getting updated to 0 after update operation
				if (record.TimeEntryOperation === "C") {
					record.TimeEntryDataFields.LSTNR = aRow.WorkListDataFields.LSTNR;
				}
				record.TimeEntryDataFields.LTXA1 = aRow.WorkListDataFields.LTXA1;
				record.TimeEntryDataFields.POSID = aRow.WorkListDataFields.POSID;
				record.TimeEntryDataFields.RPROJ = aRow.WorkListDataFields.RPROJ;
				record.TimeEntryDataFields.TASKCOMPONENT = aRow.WorkListDataFields.TASKCOMPONENT;
				record.TimeEntryDataFields.TASKLEVEL = aRow.WorkListDataFields.Catstasklevel;
				record.TimeEntryDataFields.TASKTYPE = aRow.WorkListDataFields.TASKTYPE;
				record.TimeEntryDataFields.LSTAR = aRow.WorkListDataFields.LSTAR; //Activity type

			}
			this.getModel("TimeData").refresh();
			this.getModel("controls").setProperty("/isDataChanged", true);

		},
		// Input field numeric validations
		_isValidDecimalNumber: function (number) {
			if (number !== "") {
				var numberString = number.toString();
				var colonIndex = numberString.indexOf(":");
				var seperatorIndex = colonIndex;
				var strCheck = "0123456789";
				var integerPart;
				var fractionalPart;
				var index = 0;
				var hasValue = false;
				if (seperatorIndex === -1) {
					integerPart = numberString;
					fractionalPart = "";
				} else {

					integerPart = numberString.slice(0, seperatorIndex);
					fractionalPart = numberString.slice(
						seperatorIndex + 1, numberString.length);
				}
				if (!integerPart) {
					return false;
				}

				if (integerPart.length > 5) {
					return false;
				}
				for (index = 0; index < integerPart.length; index++) {
					if (strCheck.indexOf(integerPart[index]) === -1) {
						return false;
					} else {
						hasValue = true;
					}
				}

				if (fractionalPart.length > 2) {

					return false;

				}

				for (index = 0; index < fractionalPart.length; index++) {
					if (strCheck.indexOf(fractionalPart[index]) === -1) {
						return false;
					} else {
						hasValue = true;
					}
				}
				if (hasValue === false) {
					return false;
				}

				return true;
			} else {
				return true;
			}
		},
		validateEntryTime: function (cell) {
			var self = this;
			var error;
			var time = cell.getValue();
			if (time !== "") {
				time = self.timeToDecimal(time);
			}

			if (time > 24) {
				cell.setValueState(sap.ui.core.ValueState.Error);
				cell.setTooltip("Entered time should be less than 24 hours.");
				self.getModel("controls").setProperty("/saveEnabled", false);
				self.getModel("controls").setProperty("/submitEnabled", false);
				error = true;
				cell.data("hasValidationErr", error);
			} else {
				self.getModel("controls").setProperty("/saveEnabled", true);
				self.getModel("controls").setProperty("/submitEnabled", true);
				cell.setValueState(sap.ui.core.ValueState.None);
				cell.setTooltip("");
				error = false;
				cell.data("hasValidationErr", error);

				var hasValError = this.validateAllCellErrors();
				if (hasValError) {} else {}

			}
		},
		calculateHours: function () {
			var aggr, cellsAggr, tHrs, aCnt, clmnAts, colAbs;
			var sun = 0,
				mon = 0,
				tue = 0,
				wed = 0,
				thu = 0,
				fri = 0,
				sat = 0;
			var footersum = 0;

			aCnt = 0;
			aggr = this.entryListContents.getItems();
			clmnAts = this.entryListContents.getColumns();

			for (aCnt = 0; aCnt < aggr.length; aCnt++) {
				tHrs = 0;
				cellsAggr = aggr[aCnt].getAggregation("cells");
				for (var t = 4; t <= (cellsAggr.length) - 1; t++) {
					var val = cellsAggr[t].getItems()[0].getValue();
					if (val === "") {
						val = "0";
					} else {
						val = this.timeToDecimal(val);
					}
					val = parseFloat(val, 10);
					tHrs = tHrs + val; //1)
					//Column level total
					if (t === 4) {
						mon = mon + val;
						clmnAts[t].getFooter().setText(this.formatTime(mon.toFixed(2)));
					} else if (t === 5) {
						tue = tue + val;
						clmnAts[t].getFooter().setText(this.formatTime(tue.toFixed(2)));
					} else if (t === 6) {
						wed = wed + val;
						clmnAts[t].getFooter().setText(this.formatTime(wed.toFixed(2)));
					} else if (t === 7) {
						thu = thu + val;
						clmnAts[t].getFooter().setText(this.formatTime(thu.toFixed(2)));
					} else if (t === 8) {
						fri = fri + val;
						clmnAts[t].getFooter().setText(this.formatTime(fri.toFixed(2)));
					} else if (t === 9) {
						sat = sat + val;
						clmnAts[t].getFooter().setText(this.formatTime(sat.toFixed(2)));
					} else if (t === 10) {
						sun = sun + val;
						clmnAts[t].getFooter().setText(this.formatTime(sun.toFixed(2)));
					}
					cellsAggr[3].setValue(this.formatTime(tHrs.toFixed(2))); //1) Total Hrs for that row Entry 
				}
				var footerHrs = sun + mon + tue + wed + thu + fri + sat;
				clmnAts[3].getFooter().setText(this.formatTime(footerHrs.toFixed(2)));
			}
			if (aggr.length === 0) {
				footerHrs = sun + mon + tue + wed + thu + fri + sat;
				clmnAts[3].getFooter().setText(this.formatTime(footerHrs.toFixed(2)));
				clmnAts[4].getFooter().setText(this.formatTime(mon.toFixed(2)));
				clmnAts[5].getFooter().setText(this.formatTime(tue.toFixed(2)));
				clmnAts[6].getFooter().setText(this.formatTime(wed.toFixed(2)));
				clmnAts[7].getFooter().setText(this.formatTime(thu.toFixed(2)));
				clmnAts[8].getFooter().setText(this.formatTime(fri.toFixed(2)));
				clmnAts[9].getFooter().setText(this.formatTime(sat.toFixed(2)));
				clmnAts[10].getFooter().setText(this.formatTime(sun.toFixed(2)));
			}

			//Exception Time
			var sun1 = 0,
				mon1 = 0,
				tue1 = 0,
				wed1 = 0,
				thu1 = 0,
				fri1 = 0,
				sat1 = 0;
			aCnt = 0;
			aggr = this.entryListAbsence.getItems();
			colAbs = this.entryListAbsence.getColumns();

			for (aCnt = 0; aCnt < aggr.length; aCnt++) {
				tHrs = 0;
				cellsAggr = aggr[aCnt].getAggregation("cells");
				for (var t1 = 4; t1 < (cellsAggr.length) - 1; t1++) {
					var valAbs = cellsAggr[t1].getItems()[0].getValue();
					if (valAbs === "") {
						valAbs = "0";
					} else {
						valAbs = this.timeToDecimal(valAbs);
					}
					valAbs = parseFloat(valAbs, 10);
					tHrs = tHrs + valAbs; //1)

					//Column level total
					if (t1 === 4) {
						mon1 = mon1 + valAbs;
						colAbs[t1].getFooter().setText(this.formatTime(mon1.toFixed(2)));
					} else
					if (t1 === 5) {
						tue1 = tue1 + valAbs;
						colAbs[t1].getFooter().setText(this.formatTime(tue1.toFixed(2)));
					} else if (t1 === 6) {
						wed1 = wed1 + valAbs;
						colAbs[t1].getFooter().setText(this.formatTime(wed1.toFixed(2)));
					} else if (t1 === 7) {
						thu1 = thu1 + valAbs;
						colAbs[t1].getFooter().setText(this.formatTime(thu1.toFixed(2)));
					} else if (t1 === 8) {
						fri1 = fri1 + valAbs;
						colAbs[t1].getFooter().setText(this.formatTime(fri1.toFixed(2)));
					} else if (t1 === 9) {
						sat1 = sat1 + valAbs;
						colAbs[t1].getFooter().setText(this.formatTime(sat1.toFixed(2)));
					} else if (t1 === 10) {
						sun1 = sun1 + valAbs;
						colAbs[t1].getFooter().setText(this.formatTime(sun1.toFixed(2)));
					}
					cellsAggr[3].setValue(this.formatTime(tHrs.toFixed(2))); //1) Total Hrs for that row Entry 
				}
				var footerHrsAbs = sun1 + mon1 + tue1 + wed1 + thu1 + fri1 + sat1;
				colAbs[3].getFooter().setText(this.formatTime(footerHrsAbs.toFixed(2)));
			}
			//set back to 0:00 when no items in the table
			if (aggr.length === 0) {
				footerHrsAbs = sun1 + mon1 + tue1 + wed1 + thu1 + fri1 + sat1;
				colAbs[3].getFooter().setText(this.formatTime(footerHrsAbs.toFixed(2)));
				colAbs[4].getFooter().setText(this.formatTime(mon1.toFixed(2)));
				colAbs[5].getFooter().setText(this.formatTime(tue1.toFixed(2)));
				colAbs[6].getFooter().setText(this.formatTime(wed1.toFixed(2)));
				colAbs[7].getFooter().setText(this.formatTime(thu1.toFixed(2)));
				colAbs[8].getFooter().setText(this.formatTime(fri1.toFixed(2)));
				colAbs[9].getFooter().setText(this.formatTime(sat1.toFixed(2)));
				colAbs[10].getFooter().setText(this.formatTime(sun1.toFixed(2)));
			}

			//Total Time
			var sun2 = sun + sun1,
				mon2 = mon + mon1,
				tue2 = tue + tue1,
				wed2 = wed + wed1,
				thu2 = thu + thu1,
				fri2 = fri + fri1,
				sat2 = sat + sat1;

			aCnt = 0;
			aggr = this.byId("TOTAL_HOURS").getItems();
			var clmnAts1 = this.byId("TOTAL_HOURS").getColumns();
			for (aCnt = 0; aCnt < aggr.length; aCnt++) {
				cellsAggr = aggr[aCnt].getAggregation("cells");
				for (var tot = 1; tot < (cellsAggr.length); tot++) {
					if (tot === 2) {
						cellsAggr[tot].setText(this.formatTime(mon2.toFixed(2)));
					} else if (tot === 3) {
						cellsAggr[tot].setText(this.formatTime(tue2.toFixed(2)));
					} else if (tot === 4) {
						cellsAggr[tot].setText(this.formatTime(wed2.toFixed(2)));
					} else if (tot === 5) {
						cellsAggr[tot].setText(this.formatTime(thu2.toFixed(2)));
					} else if (tot === 6) {
						cellsAggr[tot].setText(this.formatTime(fri2.toFixed(2)));
					} else if (tot === 7) {
						cellsAggr[tot].setText(this.formatTime(sat2.toFixed(2)));
					}
					if (tot === 8) {
						cellsAggr[tot].setText(this.formatTime(sun2.toFixed(2)));
					}
					var footerHrsTotal = sun2 + mon2 + tue2 + wed2 + thu2 + fri2 + sat2;
					cellsAggr[1].setText(this.formatTime(footerHrsTotal.toFixed(2)));
				}
			}
		},
		onSelectionChange: function (oEvent) {
			var self = this;
			var bEdit = false;
			var inputList = this.oConfirmDialog.getContent()[0].getFormContainers()[0].getFormElements();
			if (oEvent) {
				var selectedKey = oEvent.getParameter('selectedItem').getKey();
				var selectedText = oEvent.getParameter('selectedItem').getText();
				this.oConfirmDialog.getButtons()[0].setEnabled(true);
				var oWorkListModel = oEvent.getParameter('selectedItem').getModel("Worklist");
				var aWorkListData = oWorkListModel.getData();
				var aRow = aWorkListData.find(function (entry, id) {
					return entry.WorkListDataFields.POSID === selectedKey;
				});
			} else {
				if (self.pressedItemId) {
					bEdit = true;
					oWorkListModel = this.getModel("Worklist");
					aWorkListData = oWorkListModel.getData();
					aRow = aWorkListData.find(function (entry, id) {
						return entry.WorkListDataFields.POSID === self.pressedItemId;
					});
				}

			}
			if (aRow) {
				if (bEdit === true) {
					inputList[0].getFields()[0].setSelectedKey(self.pressedItemId);
				}
				for (var l = 0; l < inputList.length; l++) {
					//1 POSID
					if (l === 1) {
						inputList[l].getFields()[0].setValue(aRow.WorkListDataFields.ZPOSIDTEXT);
					}
					//2  Att
					if (l === 2) {
						inputList[l].getFields()[0].setValue(aRow.WorkListDataFields.ZATTTEXT);
						//	inputList[l].getFields()[0].setValue(aRow.WorkListDataFields.ZAWART);
					}
					//3"TASKCOMPONENT"
					if (l === 3) {
						inputList[l].getFields()[0].setValue(aRow.WorkListDataFields.ZTCTEXT);
					}

					//4 TASKLEVEL
					if (l === 4) {
						inputList[l].getFields()[0].setValue(aRow.WorkListDataFields.ZTLTEXT);
					}
					//5 TASKTYPE
					if (l === 5) {
						inputList[l].getFields()[0].setValue(aRow.WorkListDataFields.ZTTTEXT);
					}
				}
			} else {
				for (var l = 0; l < inputList.length; l++) {
					//1 POSID
					if (l === 1) {
						inputList[l].getFields()[0].setValue("");
					}
					//2  Att
					if (l === 2) {
						inputList[l].getFields()[0].setValue("");
					}
					//3"TASKCOMPONENT"
					if (l === 3) {
						inputList[l].getFields()[0].setValue("");
					}

					//4 TASKLEVEL
					if (l === 4) {
						inputList[l].getFields()[0].setValue("");
					}
					//5 TASKTYPE
					if (l === 5) {
						inputList[l].getFields()[0].setValue("");
					}
				}

			}
		},
		onAddAssignment: function (oEvent) {
			var self = this;
			var editEvent = "";
			var dialogOKBtnEnabled = false,
				dialogFAVBtnEnabled = true;

			var olabelName, inputName, valueHelp, vStateText, inputValue, inputEnabled;
			var olabelNameNet, inputNameNet, valueHelpNet, vStateTextNet, inputValueNet, inputEnabledNet;
			var olabelNameAct, inputNameAct, valueHelpAct, vStateTextAct, inputValueAct, inputEnabledAct;
			var olabelNameActNum, inputNameActNum, valueHelpActNum, vStateTextActNum, inputValueActNum, inputEnabledActNum;
			var olabelNameAtt, inputNameAtt, valueHelpAtt, vStateTextAtt, inputValueAtt, inputEnabledAtt;
			var olabelNameWbs, inputNameWbs, valueHelpWbs, vStateTextWbs, inputValueWbs, inputEnabledWbs;
			var olabelNameSub, inputNameSub, valueHelpSub, vStateTextSub, inputValueSub, inputEnabledSub;
			var olabelNameOper, inputNameOper, valueHelpOper, vStateTextOper, inputValueOper, inputEnabledOper;
			var olabelNameCountry, inputNameCountry, valueHelpCountry, vStateTextCountry, inputValueCountry, inputEnabledCountry;
			var olabelNameState, inputNameState, valueHelpState, vStateTextState, inputValueState, inputEnabledState;
			var olabelNameCity, inputNameCity, valueHelpCity, vStateTextCity, inputValueCity, inputEnabledCity;
			var olabelNamePltform, inputNamePltform, valueHelpPltform, vStateTextPltform, inputValuePltform, inputEnabledPltform;
			var olabelNameRoles, inputNameRoles, valueHelpRoles, vStateTextRoles, inputValueRoles, inputEnabledRoles;
			var olabelNameBill, inputNameBill, valueHelpBill, vStateTextBill, inputValueBill, inputEnabledBill;
			var olabelNameOpporId, inputNameOpporId, inputValueOpporId;
			var olabelNameNotes, inputNameNotes, inputValueNotes, inputEnabledNotes;
			var olabelNameTC, valueHelpTC, inputNameTC, vStateTextTC, inputValueTC, inputEnabledTC;
			var olabelNameTT, valueHelpTT, inputNameTT, vStateTextTT, inputValueTT, inputEnabledTT;
			var olabelNameTL, valueHelpTL, inputNameTL, vStateTextTL, inputValueTL, inputEnabledTL;
			var olabelNamePO, valueHelpPO, inputNamePO, vStateTextPO, inputValuePO, inputEnabledPO;
			var olabelNamePOItem, valueHelpPOItem, inputNamePOItem, vStateTextPOItem, inputValuePOItem, inputEnabledPOItem;
			var bNonBillChkBoxSelect = false;

			var types = this.getModel("ProfileFields").getData();
			if (self.projectDialogEdit === "X") {
				var dialogTitle = "Edit Assignment";
			} else {
				dialogTitle = "Add Assignment";
			}
			olabelName = "Project";

			for (var i = 0; i < types.length; i++) {
				var valurforEntry = "";
				var valurforEntryNotes = "";
				var valurforStateText = "";
				types[i].DefaultValue = valurforEntry;
				types[i].DefaultValue = valurforStateText;
				if (types[i].HasF4 === "X") {
					var HasF4Temp = true;
				} else {
					HasF4Temp = false;
				}
				if (types[i].IsReadOnly === "TRUE") {
					var IsReadOnlyTemp = true;
				} else {
					IsReadOnlyTemp = false;
				}
				switch (types[i].FieldLabel) {
				case "Task component":
					olabelNameTC = types[i].FieldLabel;
					valueHelpTC = false;
					inputNameTC = types[i].FieldName;
					inputValueTC = valurforEntry;
					inputEnabledTC = false;
					break;
				case "Task Type":
					olabelNameTT = types[i].FieldLabel;
					valueHelpTT = false;
					inputNameTT = types[i].FieldName;
					inputValueTT = valurforEntry;
					inputEnabledTT = false;
					break;
				case "Task level":
					olabelNameTL = types[i].FieldLabel;
					valueHelpTL = false;
					inputNameTL = types[i].FieldName;
					inputValueTL = valurforEntry;
					inputEnabledTL = false;
					break;
				case "Att./Absence type":
					olabelNameAtt = types[i].FieldLabel;
					valueHelpAtt = HasF4Temp;
					inputNameAtt = types[i].FieldName;
					inputValueAtt = valurforEntry;
					break;
				case "WBS element":
					olabelNameWbs = types[i].FieldLabel;
					valueHelpWbs = false;
					inputNameWbs = types[i].FieldName;
					inputValueWbs = valurforEntry;
					inputEnabledWbs = false;
					valueHelp = valueHelpWbs;
					inputName = inputNameWbs;
					//Dialog OK button visibility
					if (inputValueWbs !== "") {
						dialogOKBtnEnabled = true;
					} else {
						dialogOKBtnEnabled = false;
					}
					break;
				case "Short Text":
					olabelNameNotes = types[i].FieldLabel;
					inputNameNotes = types[i].FieldName;
					inputValueNotes = valurforEntryNotes;
					inputEnabledNotes = IsReadOnlyTemp;
					break;
				default:
					//Error handling
				}
			}
			self.oConfirmDialog = new sap.m.Dialog({
				title: dialogTitle,
				draggable: true,
				content: [
					new sap.ui.layout.form.Form("accountingInfos", {
						layout: new sap.ui.layout.form.ResponsiveGridLayout({
							labelSpanL: 4,
							emptySpanL: 3,
							labelSpanM: 4,
							emptySpanM: 2,
							columnsL: 1,
							columnsM: 1
						}),

						formContainers: [new sap.ui.layout.form.FormContainer("manualAccountingInfos", {
							layoutData: new sap.ui.layout.ResponsiveFlowLayoutData({
								weight: 8,
								linebreak: true
							}),

							formElements: [
								//0. Worklist

								new sap.ui.layout.form.FormElement({
									layoutData: new sap.ui.layout.ResponsiveFlowLayoutData({
										weight: 8,
										linebreak: true
									}),
									label: new sap.m.Label({
										text: "My List",
										design: "Bold",
										layoutData: new sap.ui.layout.ResponsiveFlowLayoutData({
											weight: 1
										})
									}),
									fields: [new sap.m.ComboBox({
										selectionChange: this.onSelectionChange.bind(this),
										showSecondaryValues: true
									}).bindItems({
										path: "Worklist>/",
										template: new sap.ui.core.ListItem({
											key: "{Worklist>WorkListDataFields/POSID}",
											text: "{Worklist>WorkListDataFields/ZPOSIDTEXT}"
										}),
										templateShareable: true
									}), ]
								}),
								//2. Project
								new sap.ui.layout.form.FormElement({
									visible: true,
									layoutData: new sap.ui.layout.ResponsiveFlowLayoutData({
										weight: 8,
										linebreak: true
									}),
									label: new sap.m.Label({
										text: olabelName,
										design: "Bold",
										layoutData: new sap.ui.layout.ResponsiveFlowLayoutData({
											weight: 1
										})
									}),
									fields: [new sap.m.Input({
										showValueHelp: true,
										valueHelpOnly: true,
										name: inputName,
										value: inputValue,
										editable: false,
										valueStateText: vStateText
									})]
								}),
								//6. Att
								new sap.ui.layout.form.FormElement({
									visible: true,
									layoutData: new sap.ui.layout.ResponsiveFlowLayoutData({
										weight: 8,
										linebreak: true
									}),
									label: new sap.m.Label({
										text: olabelNameAtt,
										design: "Bold",
										layoutData: new sap.ui.layout.ResponsiveFlowLayoutData({
											weight: 1
										})
									}),
									fields: [new sap.m.Input({
										showValueHelp: valueHelpAtt,
										name: inputNameAtt,
										value: inputValueAtt,
										editable: false,
										valueStateText: vStateTextAtt,
										valueHelpRequest: function (oevent) {
											self.onValueHelp(oevent, true);
										}
									})]
								}),
								//Task Component
								new sap.ui.layout.form.FormElement({
									visible: true,
									layoutData: new sap.ui.layout.ResponsiveFlowLayoutData({
										weight: 8,
										linebreak: true
									}),
									label: new sap.m.Label({
										text: olabelNameTC,
										design: "Bold",
										layoutData: new sap.ui.layout.ResponsiveFlowLayoutData({
											weight: 1
										})
									}),
									fields: [new sap.m.Input({
										showValueHelp: valueHelpTC,
										name: inputNameTC,
										value: inputValueTC,
										editable: inputEnabledTC,
										valueStateText: vStateTextTC,
									})]
								}),

								//Task Level
								new sap.ui.layout.form.FormElement({
									visible: true,
									layoutData: new sap.ui.layout.ResponsiveFlowLayoutData({
										weight: 8,
										linebreak: true
									}),
									label: new sap.m.Label({
										text: olabelNameTL,
										design: "Bold",
										layoutData: new sap.ui.layout.ResponsiveFlowLayoutData({
											weight: 1
										})
									}),
									fields: [new sap.m.Input({
										showValueHelp: valueHelpTL,
										name: inputNameTL,
										value: inputValueTL,
										editable: inputEnabledTL,
										valueStateText: vStateTextTL,
									})]
								}),

								//Task Type
								new sap.ui.layout.form.FormElement({
									visible: true,
									layoutData: new sap.ui.layout.ResponsiveFlowLayoutData({
										weight: 8,
										linebreak: true
									}),
									label: new sap.m.Label({
										text: olabelNameTT,
										design: "Bold",
										layoutData: new sap.ui.layout.ResponsiveFlowLayoutData({
											weight: 1
										})
									}),
									fields: [new sap.m.Input({
										showValueHelp: valueHelpTT,
										name: inputNameTT,
										value: inputValueTT,
										editable: inputEnabledTT,
										valueStateText: vStateTextTT,
									})]
								}),
								// work location
								// new sap.ui.layout.form.FormElement({
								// 	visible: true,
								// 	layoutData: new sap.ui.layout.ResponsiveFlowLayoutData({
								// 		weight: 8,
								// 		linebreak: true
								// 	}),
								// 	label: new sap.m.Label({
								// 		text: "Work Location",
								// 		design: "Bold",
								// 		layoutData: new sap.ui.layout.ResponsiveFlowLayoutData({
								// 			weight: 1
								// 		})
								// 	}),
								// 	fields: [new sap.m.Input({
								// 		value: "Denver, CO",
								// 		editable: false,
								// 	})]
								// }),
							]
						})]
					}) //Form

				], //content

				buttons: [{
					text: "Ok",
					icon: "sap-icon://accept",
					enabled: dialogOKBtnEnabled,
					press: jQuery.proxy(function () {
						self.onAddNewEntry(oEvent);
					}, this)
				}, {
					text: "Cancel",
					icon: "sap-icon://cancel",
					press: jQuery.proxy(function () {
						this.pressedItemId = "";
						this.projectDialogEdit = "";
						this.oConfirmDialog.close();
						this.oConfirmDialog.destroy();
						this.oConfirmDialog = null;
					}, this)
				}]
			}); //Dialog
			self.getView().addDependent(self.oConfirmDialog);
			self.oConfirmDialog.open();
			self.onSelectionChange("");
		},
		onValueHelp: function (oEvent) {
			var that = this;
			var FieldName = "AWART";
			new Promise(
				function (fnResolve, fnReject) {
					that.getValueHelpCollection(FieldName);
					fnResolve(that.valueHelpFragment());
					fnReject();
				}
			);
		},
		getValueHelpCollection: function (FieldName) {
			var that = this;
			var oModel = new sap.ui.model.json.JSONModel();
			var f = [];
			var c = new sap.ui.model.Filter({
				path: "Pernr",
				operator: sap.ui.model.FilterOperator.EQ,
				value1: this.empID
			});
			var d = new sap.ui.model.Filter({
				path: "FieldName",
				operator: sap.ui.model.FilterOperator.EQ,
				value1: FieldName
			});
			f.push(c);
			f.push(d);
			var mParameters = {
				urlParameters: '$expand=ValueHelpHits',
				filters: f,
				success: function (oData, oResponse) {
					that.results = oData.results[0].ValueHelpHits.results;;
					oModel.setData(that.results);
					that.setModel(oModel, "ValueHelp");
				},
				error: function (oError) {
					that.oErrorHandler.processError(oError);
				}
			};
			this.oDataModel.read('/ValueHelpCollection', mParameters);
		},
		valueHelpFragment: function () {
			var that = this;
			var oView = this.getView();
			// create dialog lazily
			var oDialog;
			if (!oDialog) {
				var oDialogController = {
					handleConfirm: that.handleClick.bind(that),
					handleCancel: function (oEvent) {
						// oDialog.close();
						oDialog.destroy();
					}.bind(that),
					onValueHelp: that.onValueHelp.bind(that),
					handleClickValueHelp: that.handleClick.bind(that),
					handleSearch: that.handleSearch.bind(that)
				};
				// create dialog via fragment factory
				oDialog = sap.ui.xmlfragment(oView.getId(), "cgdc.timesheet.view.fragment.ValueHelp", oDialogController);
				// connect dialog to view (models, lifecycle)
				oView.addDependent(oDialog);
			}
			jQuery.sap.syncStyleClass("sapUiSizeCompact", this.getView(), oDialog);

			jQuery.sap.delayedCall(0, this, function () {
				oDialog.open();
			});
		},
		handleClick: function (oEvent) {
			var inputList = this.oConfirmDialog.getContent()[0].getFormContainers()[0].getFormElements();
			var sSelectedKey = oEvent.getParameters().selectedItem.getDescription();
			this.oConfirmDialog.getContent()[0].getFormContainers()[0].getFormElements()[2].getFields()[0].setValue(sSelectedKey);
			var sFormSelectedProject = inputList[0].getFields()[0].getSelectedKey();
			if (sFormSelectedProject) {}
		},
		handleSearch: function (oEvent) {
			var that = this;
			var sValue = oEvent.getParameters().value;
			var oList = oEvent.getSource().getBinding("items");
			var oFilter = [];
			oFilter.push(new Filter("FieldValue", "EQ", sValue));
			oFilter.push(new Filter("Pernr", "EQ", this.empID));
			oFilter.push(new Filter("FieldName", "EQ", "AWART"));
			var mParameters = {
				urlParameters: '$expand=ValueHelpHits',
				filters: oFilter,
				success: function (oData, oResponse) {
					that.results = oData.results[0].ValueHelpHits.results;;
					that.getModel("ValueHelp").setData(that.results);
				},
				error: function (oError) {
					that.oErrorHandler.processError(oError);
				}
			};
			this.oDataModel.read('/ValueHelpCollection', mParameters);

		},
		onAddAssignmentMultiWbs: function (oEvent) {
			this.sPanel = oEvent.getSource().getParent().getParent();
			var that = this;
			var oView = this.getView();
			// create dialog lazily
			var oDialog;
			if (!oDialog) {
				var oDialogController = {
					handleSelectWbsOk: that.handleSelectWbsOk.bind(that),
					handleProjectCreateCloseWbs: function (oEvent) {
						oDialog.destroy();
					}.bind(that),
				};
				// create dialog via fragment factory
				oDialog = sap.ui.xmlfragment(oView.getId(), "cgdc.timesheet.view.fragment.SelectWbs", oDialogController);
				// connect dialog to view (models, lifecycle)
				oView.addDependent(oDialog);
			}
			jQuery.sap.syncStyleClass("sapUiSizeCompact", this.getView(), oDialog);

			jQuery.sap.delayedCall(0, this, function () {
				oDialog.open();
			});
		},
		onBeforeOpenWbsDialog: function (oEvent) {},
		handleSelectWbsOk: function (oEvent) {
			var self = this;
			var tblRows = this.entryListContents.getItems();
			var tblRows = this.entryListContents.getItems();
			if (this.sPanel.getExpanded() === false) {
				this.sPanel.setExpanded(true);
			}
			if (oEvent) {
				oEvent.getSource().getParent().close();
				var aSelectedKeys = oEvent.getSource().getParent().getContent()[0].getItems()[1].getSelectedKeys();
			} else {
				if (this.selKeys.length) {
					var aSelectedKeys = [];
					for (var i = 0; i < this.selKeys.length; i++) {
						aSelectedKeys.push(this.selKeys[i].posid);
					}
				}
			}
			if (aSelectedKeys.length) {
				var sFound = false;
				for (var i = 0; i < aSelectedKeys.length; i++) {
					for (var j = 0; j < tblRows.length; j++) {
						if (tblRows[j].getCells()[1].getText() === aSelectedKeys[i]) {
							sFound = true;
						}
					}

					if (sFound === false) {
						for (var i = 0; i < aSelectedKeys.length; i++) {
							var oWorkListModel = this.getModel("Worklist");
							var aWorkListData = oWorkListModel.getData();
							var aRow = aWorkListData.find(function (entry, id) {
								return entry.WorkListDataFields.POSID === aSelectedKeys[i];
							});
							var oTableItems = this.entryListContents.getItems();
							if (aRow) {
								aRow.WorkListDataFields.ZAWART = "WRK";
								var sTitle = aRow.WorkListDataFields.ZPOSIDTEXT;
								var sPosId = aRow.WorkListDataFields.POSID;
								// var sText = aRow.WorkListDataFields.CatsxtTaskcomponentText + "," + aRow.WorkListDataFields.CatsxtTasklevelText + "," +
								// 	aRow.WorkListDataFields
								// 	.CatsxtTasktypeText ; //+ "," + "Denver, CO";
								var sText = this.getForattedsText(aRow);
								var sKey = aSelectedKeys[i];
							}
							var S = new sap.m.ColumnListItem({});
							var o = new sap.m.HBox({
								items: [
									new sap.m.ObjectIdentifier({
										title: sTitle,
										text: sText,
										titleActive: true,
										titlePress: function (oevent) {
											self.projectDialogEdit = "X";
											self.onItemSelectGotoEdit(oevent);
											self.onAddAssignment(oevent);
										}
									})
								]
							});
							o.addCustomData(new sap.ui.core.CustomData({
								key: "wbs",
								value: sPosId
							}));
							S.addCell(o);
							S.addCell(new sap.m.Text({
								text: sKey
							}));
							var cell = new sap.m.HBox({
								items: [
									new sap.ui.core.Icon({
										src: "sap-icon://delete",
										press: function (oEvent) {
											var row = oEvent.getSource().getParent().getParent();
											self.performDeleteRow(row);
										},
										tooltip: "Delete"
									})
								]
							});
							cell.addCustomData(new sap.ui.core.CustomData({
								key: "Copied",
								value: false
							}));
							S.addCell(cell);
							S.addCell(new sap.m.Input({ //Total field
								type: "Text",
								textAlign: "Center",
								editable: false,
								value: "00:00",
							}));
							for (var iWD = 0; iWD < 7; iWD++) {
								var recordedHrs = "";
								var cell = new sap.m.FlexBox({
									justifyContent: "Center",
									items: [
										new sap.m.Input({
											type: "Text",
											textAlign: "Center",
											value: recordedHrs,
											placeholder: "hh:mm",
											liveChange: function (oEvent) {
												if (self._isValidDecimalNumber(this.getValue())) {
													self.validateEntryTime(this);
													self.calculateHours();
												} else {
													this.setValueState(sap.ui.core.ValueState.Error);
													this.getModel("controls").setProperty("/saveEnabled", false);
													this.getModel("controls").setProperty("/submitEnabled", false);
												}
											},
											change: function () {
												var timeEntry = this.getValue();
												if (timeEntry !== "") {
													timeEntry = self.adjustTime(timeEntry);
													this.setValue(timeEntry);

												}
												self.updateTimeEntriesModel(this);
											}
										}),
										new sap.ui.core.Icon({
											src: "sap-icon://write-new-document",
											color: "#0854a0",
											tooltip: this.oBundle.getText("additionaldetails"),
											press: this.longtextPopover.bind(this)
										}).addStyleClass("sapUiTinyMarginBegin sapUiTinyMarginTop")

									]

								});

								cell.addCustomData(new sap.ui.core.CustomData({
									key: "Hours",
									value: recordedHrs
								}));
								S.addCell(cell);
							}
							this.entryListContents.addItem(S);
							this.getModel("controls").setProperty("/isDataChanged", true);
							this.addEntriesInTimeDataModel(aRow.WorkListDataFields.POSID, aRow.WorkListDataFields.ZATTTEXT.split("(")[1].split(")")[0],
								aRow.WorkListDataFields.TASKCOMPONENT, aRow.WorkListDataFields.Catstasklevel,
								aRow.WorkListDataFields.TASKTYPE);
						}
						//	}
					}
				}
				sap.m.MessageToast.show(this.getResourceBundle().getText("assignmentadded"));
			}
			this.pressedItemId = "";
			this.projectDialogEdit = "";
		},
		onAddNewEntry: function (oEvent) {
			if (this.projectDialogEdit === "X") {
				this.updateTableRowTitle();
			} else {
				this.addTableRow(oEvent);
			}
			this.oConfirmDialog.close();
			this.oConfirmDialog.destroy();
			this.oConfirmDialog = null;
		},
		updateTableRowTitle: function () {
			var that = this;
			var oTableItems = this.entryListContents.getItems();
			var inputList = this.oConfirmDialog.getContent()[0].getFormContainers()[0].getFormElements();
			if (this.pressedItemId) {
				var sSelectedKey = inputList[0].getFields()[0].getSelectedKey();
				for (var l = 0; l < oTableItems.length; l++) {
					if (oTableItems[l].getAggregation("cells")[1].getText().trim() === this.pressedItemId.trim()) {
						var iIndex = l;
						break;
					}
				}
				var sPosIdToUpdate = inputList[0].getFields()[0].getSelectedKey();
				var sAwartToUpdate = inputList[2].getFields()[0].getValue().split("(")[1].split(")")[0];
				var sTkToUpdate = inputList[3].getFields()[0].getValue().split("(")[1].split(")")[0];
				var sTlToUpdate = inputList[4].getFields()[0].getValue().split("(")[1].split(")")[0];
				var sTtToUpdate = inputList[5].getFields()[0].getValue().split("(")[1].split(")")[0];
				var data = this.getModel("TimeData").getData();
				if (oTableItems[iIndex].getAggregation("cells")[1].getText().trim() === sSelectedKey) {
					var aRows = data.filter(function (entry, id) {
						return entry.TimeEntryDataFields.POSID === that.pressedItemId;
					});
					if (aRows.length) {
						for (var k = 0; k < aRows.length; k++) {
							aRows[k].TimeEntryDataFields.POSID = sPosIdToUpdate;
							aRows[k].TimeEntryDataFields.AWART = sAwartToUpdate;
							aRows[k].TimeEntryDataFields.TASKCOMPONENT = sTkToUpdate;
							aRows[k].TimeEntryDataFields.TASKLEVEL = sTlToUpdate;
							aRows[k].TimeEntryDataFields.TASKTYPE = sTtToUpdate;
							if (aRows[k].Counter) {
								aRows[k].TimeEntryOperation = "U";
							} else {
								if (aRows[k].TimeEntryDataFields.CATSHOURS && parseInt(aRows[k].TimeEntryDataFields.CATSHOURS !== 0)) aRows[k].imeEntryOperation =
									"C";
							}
						}
						that.getModel("TimeData").refresh(true);
						that.getModel("controls").setProperty("/isDataChanged", true);
					}
					var oWorkListModel = this.getModel("Worklist");
					var aWorkListData = oWorkListModel.getData();
					var aRow = aWorkListData.find(function (entry, id) {
						return entry.WorkListDataFields.POSID === that.pressedItemId;
					});
					oTableItems[iIndex].getAggregation("cells")[0].getItems()[0].setTitle(inputList[1].getFields()[0].getValue());
					oTableItems[iIndex].getAggregation("cells")[0].getItems()[0].setText(that.getForattedsText(aRow));
					oTableItems[iIndex].getAggregation("cells")[1].setText(sSelectedKey);

				} else {
					for (var m = 0; m < oTableItems.length; m++) {
						if (iIndex !== m) {
							if (oTableItems[m].getAggregation("cells")[1].getText().trim() === sSelectedKey) {
								this.pressedItemId = "";
								this.projectDialogEdit = "";
								sap.m.MessageToast.show("project already added");
								return;
							}
						}
					}
					var aRowsData = this.getModel("aTableRows").getData();
					aRow = aRowsData.find(function (entry, id) {
						return entry.posid === sSelectedKey;
					});
					if (aRow) {
						this.pressedItemId = "";
						this.projectDialogEdit = "";
						sap.m.MessageToast.show("project already added");
						return;
					} else {

						aRows = data.filter(function (entry, id) {
							return entry.TimeEntryDataFields.POSID === that.pressedItemId;
						});
						if (aRows.length) {
							for (var k = 0; k < aRows.length; k++) {
								aRows[k].TimeEntryDataFields.POSID = sPosIdToUpdate;
								aRows[k].TimeEntryDataFields.AWART = sAwartToUpdate;
								aRows[k].TimeEntryDataFields.TASKCOMPONENT = sTkToUpdate;
								aRows[k].TimeEntryDataFields.TASKLEVEL = sTlToUpdate;
								aRows[k].TimeEntryDataFields.TASKTYPE = sTtToUpdate;
								if (aRows[k].Counter && aRows[k].Counter !== null && aRows[k].Counter !== "") {
									aRows[k].TimeEntryOperation = "U";
								} else {
									if (aRows[k].TimeEntryDataFields.CATSHOURS && parseInt(aRows[k].TimeEntryDataFields.CATSHOURS) !== 0) aRows[k].imeEntryOperation =
										"C";
								}
							}
							that.getModel("TimeData").refresh(true);
							that.getModel("controls").setProperty("/isDataChanged", true);

						}
						oWorkListModel = this.getModel("Worklist");
						aWorkListData = oWorkListModel.getData();
						var oWorklistEntry = aWorkListData.find(function (entry, id) {
							return entry.WorkListDataFields.POSID === sSelectedKey;
						});
						oTableItems[iIndex].getAggregation("cells")[0].getItems()[0].setTitle(inputList[1].getFields()[0].getValue());
						oTableItems[iIndex].getAggregation("cells")[0].getItems()[0].setText(that.getForattedsText(oWorklistEntry));
						oTableItems[iIndex].getAggregation("cells")[1].setText(sSelectedKey);

					}
				}
			}
			this.pressedItemId = "";
			this.projectDialogEdit = "";
		},
		addTableData: function () {
			var self = this;
			var aExistingData = this.getModel("aTableRows").getData();
			if (aExistingData.length !== 0) {
				self.getModel("controls").setProperty("/prevWeekBut", false);
				for (var i = 0; i < aExistingData.length; i++) {
					var sKey = aExistingData[i].posid;
					var oWorkListModel = this.getModel("Worklist");
					var aWorkListData = oWorkListModel.getData();
					var aRow = aWorkListData.find(function (entry, id) {
						return entry.WorkListDataFields.POSID === sKey;
					});
					if (aRow) {
						var sTitle = aRow.WorkListDataFields.ZPOSIDTEXT;
						var sPosId = aRow.WorkListDataFields.POSID;
						// if(aRow.WorkListDataFields.CatsxtTaskcomponentText && aRow.WorkListDataFields.CatsxtTasklevelText && aRow.WorkListDataFields.CatsxtTasktypeText){
						// var sText = aRow.WorkListDataFields.CatsxtTaskcomponentText + "," + aRow.WorkListDataFields.CatsxtTasklevelText + "," + aRow.WorkListDataFields
						// 	.CatsxtTasktypeText ; //+ "," + "Denver, CO";
						// }else if(!aRow.WorkListDataFields.CatsxtTaskcomponentText && !aRow.WorkListDataFields.CatsxtTasklevelText && !aRow.WorkListDataFields.CatsxtTasktypeText){
						// 	sText = "";
						// }else if(!aRow.WorkListDataFields.CatsxtTaskcomponentText || !aRow.WorkListDataFields.CatsxtTasklevelText || !aRow.WorkListDataFields.CatsxtTasktypeText){
						// 	sText = aRow.WorkListDataFields.CatsxtTaskcomponentText + "," + aRow.WorkListDataFields.CatsxtTasklevelText + "," + aRow.WorkListDataFields
						// 	.CatsxtTasktypeText;
						// }
						var sText = this.getForattedsText(aRow);
					} else {
						sTitle = sKey;
						sPosId = sKey;
						sText = sKey; //+ "," + "Denver, CO";
					}
					var oWorklistModelData = this.getModel("WorklistFields").getData();
					var aRow1 = oWorklistModelData.find(function (entry, id) {
						return entry.POSID === sKey;
					});
					if (aRow1) {
						aRow.WorkListDataFields.ZTASKLEVEL = aRow1.TASKLEVEL;
					} else {}
					var bValue = true;
					if (aExistingData[i].overallWeekStatus) {
						bValue = formatter.buttonEnableMain(aExistingData[i].overallWeekStatus);
					}
					var S = new sap.m.ColumnListItem({});
					var o = new sap.m.HBox({
						items: [
							new sap.m.ObjectIdentifier({
								title: sTitle,
								text: sText,
								titleActive: bValue,
								titlePress: function (oevent) {
									self.projectDialogEdit = "X";
									self.onItemSelectGotoEdit(oevent);
									self.onAddAssignment(oevent);
								}
							})
						]
					});
					o.addCustomData(new sap.ui.core.CustomData({
						key: "wbs",
						value: sPosId
					}));
					S.addCell(o);
					S.addCell(new sap.m.Text({
						text: sPosId
					}));
					var cell = new sap.m.HBox({
						items: [

							new sap.ui.core.Icon({
								//enabled: true,
								src: "sap-icon://delete",
								press: function (oEvent) {
									var row = oEvent.getSource().getParent().getParent();
									self.performDeleteRow(row);
								},
								tooltip: "Delete"
							})
						]
					});
					cell.addCustomData(new sap.ui.core.CustomData({
						key: "Copied",
						value: false
					}));
					S.addCell(cell);

					S.addCell(new sap.m.Input({ //Total field
						type: "Text",
						textAlign: "Center",
						editable: false,
						value: "00:00",
					}));
					for (var iWD = 0; iWD < aExistingData[i].rowsdata.length; iWD++) {
						var recordedHrs = "";
						recordedHrs = aExistingData[i].rowsdata[iWD].CATSHOURS;
						if (aRow && aExistingData[i].rowsdata[iWD].AWART) {
							aRow.WorkListDataFields.ZAWART = aExistingData[i].rowsdata[iWD].AWART;
							oWorkListModel.refresh(true);
						}
						var bEnabled = true;
						var sValueState = "None";
						if (aExistingData[i].rowsdata[iWD].STATUS === "30" && aExistingData[i].rowsdata[iWD].AllowEdit === "") {
							bEnabled = false;
						} else if (aExistingData[i].rowsdata[iWD].STATUS === "40") {
							sValueState = "Error";
						} else {
							bEnabled = true;
						}
						/*if (aExistingData[i].rowsdata[iWD].STATUS === "30") {
							bEnabled = false;
						} else if (aExistingData[i].rowsdata[iWD].STATUS === "40") {
							sValueState = "Error";
						}*/
						var sText1 = aExistingData[i].rowsdata[iWD].RejReasondesc;
						var cell = new sap.m.FlexBox({
							justifyContent: "Center",
							items: [
								new sap.m.Input({
									valueState: sValueState,
									valueStateText: sText1,
									type: "Text",
									textAlign: "Center",
									value: recordedHrs,
									editable: bEnabled,
									placeholder: "hh:mm",
									liveChange: function (oEvent) {
										if (self._isValidDecimalNumber(this.getValue())) {
											self.validateEntryTime(this);
											self.calculateHours();
										} else {
											this.setValueState(sap.ui.core.ValueState.Error);
											this.getModel("controls").setProperty("/saveEnabled", false);
											this.getModel("controls").setProperty("/submitEnabled", false);
										}
									},
									change: function () {
										var timeEntry = this.getValue();
										if (timeEntry !== "") {
											timeEntry = self.adjustTime(timeEntry);
											this.setValue(timeEntry);
										}
										self.updateTimeEntriesModel(this);
									}
								}),
								new sap.ui.core.Icon({
									src: "sap-icon://write-new-document",
									color: "#0854a0",
									tooltip: this.oBundle.getText("additionaldetails"),
									press: this.longtextPopover.bind(this),
									visible: false

								}).addStyleClass("sapUiTinyMarginBegin sapUiTinyMarginTop"),
								new sap.ui.core.Icon({
									src: "sap-icon://notification-2",
									color: "#0854a0",
									tooltip: this.oBundle.getText("comments"),
									press: this.displaylongtextPopover.bind(this),
									visible: false
								}).addStyleClass("sapUiTinyMarginBegin sapUiTinyMarginTop")

							]

						});

						cell.addCustomData(new sap.ui.core.CustomData({
							key: "Hours",
							value: recordedHrs
						}));
						if (bEnabled) {
							cell.getItems()[1].setVisible(true);
							cell.getItems()[2].setVisible(false);
						} else {
							cell.getItems()[2].setVisible(true);
							cell.getItems()[1].setVisible(false);
						}
						S.addCell(cell);

					}
					this.entryListContents.addItem(S);
				}
				this.addAwartInTimeDataModel();
			} else {
				self.getModel("controls").setProperty("/prevWeekBut", true);
			}
		},
		displaylongtextPopover: function (oEvent) {
			if (sap.ui.Device.system.phone !== true) {
				var cell = oEvent.getSource().getParent();
				var sPosition = "";
				if (cell.getParent().getCells()[0].getId().includes("__text")) {
					sPosition = "INPUT";
				} else if (cell.getParent().getCells()[0].getId().includes("__box")) {
					sPosition = "COMBO";
				} else if (cell.getParent().getCells()[0].getItems()[0].getId().includes("__identifier")) {
					sPosition = "OBJECTI";
				}
				var iIndex = this.getSelectedItemIndexInTimeDataModel(cell, sPosition);
				var path = "/" + parseInt(iIndex);
			} else {
				path = oEvent.getSource().getBindingContext('TimeData').getPath();
			}
			// create popover
			var that = this;
			var oDialogController = {
				handleClose: function (event) {
					that._oPopover.close();
				},
				commentDisplay: this.formatter.commentDisplay.bind(this)
			};
			this._oPopover = sap.ui.xmlfragment(this.getView().getId(), "cgdc.timesheet.view.fragment.LongTextPopOver",
				oDialogController);
			this.getView().addDependent(this._oPopover);
			this._oPopover.bindElement('TimeData>' + path);

			// delay because addDependent will do a async rerendering and the popover will immediately close without it
			var oButton = oEvent.getSource();
			jQuery.sap.delayedCall(0, this, function () {
				this._oPopover.openBy(oButton);
			});
		},
		getSelectedItemIndexInTimeDataModel: function (cell, position) {
			var colhead, coldate, sYear;
			var data = this.getModel("TimeData").getData();
			var aggr = this.entryListContents.getItems();
			var sFilter = "";
			var iIndex, clmnAts;
			if (position === "INPUT") {
				sFilter = cell.getParent().getCells()[1].getText();
				clmnAts = this.entryListAbsence.getColumns();
			} else if (position === "COMBO") {
				sFilter = cell.getParent().getCells()[0].getSelectedKey();
				clmnAts = this.entryListAbsence.getColumns();
			} else if (position === "OBJECTI") {
				sFilter = cell.getParent().getCells()[1].getText();
				clmnAts = this.entryListContents.getColumns();
			}

			var calendarIntervalStartDate = this.mCalendar.getStartDate();
			var oCells = cell.getParent().getAggregation("cells");
			var cellindex = cell.getParent().indexOfCell(cell);
			for (var t = cellindex; t <= (oCells.length) - 1; t++) {
				if (t === 3) {
					colhead = clmnAts[t].getHeader().getItems()[1].getText();
					sYear = clmnAts[t].getHeader().getItems()[2].getText();
					break;
				} else if (t === 4) {
					colhead = clmnAts[t].getHeader().getItems()[1].getText();
					sYear = clmnAts[t].getHeader().getItems()[2].getText();
					break;
				} else if (t === 5) {
					colhead = clmnAts[t].getHeader().getItems()[1].getText();
					sYear = clmnAts[t].getHeader().getItems()[2].getText();
					break;
				} else if (t === 6) {
					colhead = clmnAts[t].getHeader().getItems()[1].getText();
					sYear = clmnAts[t].getHeader().getItems()[2].getText();
					break;
				} else if (t === 7) {
					colhead = clmnAts[t].getHeader().getItems()[1].getText();
					sYear = clmnAts[t].getHeader().getItems()[2].getText();
					break;
				} else if (t === 8) {
					colhead = clmnAts[t].getHeader().getItems()[1].getText();
					sYear = clmnAts[t].getHeader().getItems()[2].getText();
					break;
				} else if (t === 9) {
					colhead = clmnAts[t].getHeader().getItems()[1].getText();
					sYear = clmnAts[t].getHeader().getItems()[2].getText();
					break;
				} else if (t === 10) {
					colhead = clmnAts[t].getHeader().getItems()[1].getText();
					sYear = clmnAts[t].getHeader().getItems()[2].getText();
					break;
				}
			}
			coldate = sYear + "-" + colhead.split("/")[0] + "-" + colhead.split("/")[1];
			var coldate1 = new Date(coldate);
			coldate1 = new Date(coldate1.getUTCFullYear(), coldate1.getUTCMonth(), coldate1.getUTCDate());
			coldate1.setHours(0);
			coldate1.setMinutes(0);
			coldate1.setSeconds(0);
			coldate1.setMilliseconds(0);
			if (position === "OBJECTI") {
				for (var l = 0; l < data.length; l++) {
					if (this.oFormatyyyymmdd.format(data[l].TimeEntryDataFields.WORKDATE) === this.oFormatyyyymmdd.format(coldate1) &&
						data[l].TimeEntryDataFields.POSID === sFilter) {
						iIndex = l;
						break;
					}
				}
			} else {
				for (var l = 0; l < data.length; l++) {
					if (this.oFormatyyyymmdd.format(data[l].TimeEntryDataFields.WORKDATE) === this.oFormatyyyymmdd.format(coldate1) &&
						data[l].TimeEntryDataFields.AWART === sFilter) {
						iIndex = l;
						break;
					}
				}
			}
			return iIndex;
		},
		longtextPopover: function (oEvent) {
			var that = this;
			if (sap.ui.Device.system.phone !== true) {
				var cell = oEvent.getSource().getParent();
				var sPosition = "";
				if (cell.getParent().getCells()[0].getId().includes("__text")) {
					sPosition = "INPUT";
				} else if (cell.getParent().getCells()[0].getId().includes("__box")) {
					sPosition = "COMBO";
				} else if (cell.getParent().getCells()[0].getItems()[0].getId().includes("__identifier")) {
					sPosition = "OBJECTI";
				}
				var iIndex = this.getSelectedItemIndexInTimeDataModel(cell, sPosition);
				var sPath = "/" + parseInt(iIndex);
			} else {
				sPath = oEvent.getSource().getBindingContext('TimeData').getPath();
			}
			var oDialogController = {
				handleClose: function (event) {
					var data = $.extend(true, [], this.getModel('oldModel').getData());
					var oModel = new JSONModel(data);
					this.setModel(oModel, 'TimeData');
					that.dialog.close();
					that.dialog.destroy();
				}.bind(this),
				onLongTextEdit: this.onTextEdit.bind(this),
				onLongTextDelete: this.onTextDelete.bind(this),
				onPost: this.onLongTextPost.bind(this),
				onWLValueHelpRequest: this.onWorkLocValueHelpRequest.bind(this),
				formatter: this.formatter.visibility.bind(this),
				formatText: function (oText) {
					return oText;
				},
				handleOk: function (oEvent) {
					var timeCatValue = "";
					var index = oEvent.getSource().getParent().getBindingContext('TimeData').getPath().split('/')[1];
					var data = this.getModel('TimeData').getData();
					var workLocation = this.getView().byId("idWorkLoc").getValue();
					if (this.getView().byId("idPTCVH").getSelectedItem() !== null) {
						timeCatValue = this.getView().byId("idPTCVH").getSelectedItem().getKey();
					}
					//if (workLocation !== "") { //timeCatValue !== "" && 
					var iActualTime = this.timeToDecimal(data[index].TimeEntryDataFields.CATSHOURS);
					data[index].TimeEntryDataFields.ProjTimeCat = timeCatValue;
					data[index].TimeEntryDataFields.WrkLoc = workLocation;
					if (data[index].Counter) {
						data[index].TimeEntryOperation = 'U';
						this.getModel("controls").setProperty("/isDataChanged", true);
					} else {
						if (iActualTime !== 0) {
							data[index].TimeEntryOperation = 'C';
							this.getModel("controls").setProperty("/isDataChanged", true);
						}
					}

					that.dialog.close();
					that.dialog.destroy();
					// } else { // if (workLocation === undefined || workLocation === "") 
					// 	sap.m.MessageToast.show("Please input Work Location");
					// }

				}.bind(this)
			};
			var data = $.extend(true, [], this.getModel('TimeData').getData());
			var oModel = new JSONModel(data);
			this.setModel(oModel, "oldModel");
			this.dialog = sap.ui.xmlfragment(this.getView().getId(), "cgdc.timesheet.view.fragment.EditLongTextPopOver",
				oDialogController);
			this.getView().addDependent(this.dialog);
			this.dialog.bindElement('TimeData>' + sPath);
			var selectModel = new JSONModel(data);
			this.setModel(selectModel, "TimeEntry");
			var oButton = oEvent.getSource();
			jQuery.sap.delayedCall(0, this, function () {
				this.dialog.open(oButton);
				var iIndex1 = this.dialog.getBindingContext("TimeData").sPath.split("/")[1];
				var oTimeEntryDataFields = this.getModel("TimeData").getData()[iIndex1].TimeEntryDataFields;
				var oDate = this.oBundle.getText("postComments", [formatter.dateStringFormat2(oTimeEntryDataFields.WORKDATE)]);
				this.dialog.getContent()[1].setPlaceholder(oDate);
				if (oTimeEntryDataFields.ProjTimeCat !== undefined && oTimeEntryDataFields.WrkLoc !== undefined) {
					this.getView().byId("idWorkLoc").setValue(oTimeEntryDataFields.WrkLoc);
					this.getView().byId("idPTCVH").setSelectedItem().setSelectedKey(oTimeEntryDataFields.ProjTimeCat);
				}
			});
		},
		onTextEdit: function (oEvent) {
			if (oEvent.getSource().getParent().getParent().getAggregation('items')[0].getText()) {
				this.byId('feedInput').setValue(oEvent.getSource().getParent().getParent().getAggregation('items')[0].getText());
				this.byId('feedInput').setEnabled(true);
			}
		},
		onTextDelete: function (oEvent) {
			if (oEvent.getSource().getParent().getParent().getAggregation('items')[0].getText()) {
				var index = oEvent.getSource().getParent().getParent().getBindingContext('TimeData').getPath().split('/')[1];
				oEvent.getSource().getParent().getParent().getAggregation('items')[0].setText("");
				var okButton = oEvent.getSource().getParent().getParent().getParent().getAggregation('beginButton');
				var data = this.getModel('TimeData').getData();
				data[index].TimeEntryDataFields.LONGTEXT_DATA = "";
				data[index].TimeEntryDataFields.LONGTEXT = '';
				var iActualTime = that.timeToDecimal(data[index].TimeEntryDataFields.CATSHOURS);
				if (data[index].Counter) {
					data[index].TimeEntryOperation = 'U';
					this.getModel("controls").setProperty("/isDataChanged", true);
				} else {
					if (iActualTime !== 0) {
						data[index].TimeEntryOperation = 'C';
						this.getModel("controls").setProperty("/isDataChanged", true);
					}
				}
				var oModel = new JSONModel(data);
				this.setModel(oModel, "TimeData");
				okButton.setEnabled(true);
			}
		},
		onLongTextPost: function (oEvent) {
			var index = oEvent.getSource().getParent().getBindingContext('TimeData').getPath().split('/')[1];
			var okButton = oEvent.getSource().getParent().getAggregation('beginButton');
			var data = this.getModel('TimeData').getData();
			if (oEvent.getParameter('value')) {
				var iActualTime = this.timeToDecimal(data[index].TimeEntryDataFields.CATSHOURS);
				data[index].TimeEntryDataFields.LONGTEXT_DATA = oEvent.getParameter('value');
				data[index].TimeEntryDataFields.LONGTEXT = 'X';
				if (data[index].Counter) {
					data[index].TimeEntryOperation = 'U';
					this.getModel("controls").setProperty("/isDataChanged", true);
				} else {
					if (iActualTime !== 0) {
						data[index].TimeEntryOperation = 'C';
						this.getModel("controls").setProperty("/isDataChanged", true);
					}
				}
				var oModel = new JSONModel(data);
				this.setModel(oModel, "TimeData");
				okButton.setEnabled(true);
			}
		},
		addAwartInTimeDataModel: function () {
			var aExistingData = this.getModel("Worklist").getData();
			var data = this.getModel("TimeData").getData();
			for (var i = 0; i < aExistingData.length; i++) {
				var aRows = data.filter(function (entry, id) {
					return entry.TimeEntryDataFields.POSID === aExistingData[i].WorkListDataFields.POSID;
				});
				if (aRows.length) {
					for (var j = 0; j < aRows.length; j++) {
						aRows[j].TimeEntryDataFields.AWART = aExistingData[i].WorkListDataFields.ZAWART;
					}
				}
			}
		},
		addTableRowHrs: function () {
			var oModel = this.getModel("aTableRowsHours");
			var data = oModel.getData()[0];
			var S = new sap.m.ColumnListItem({});

			S.addCell(new sap.m.Label({
				text: this.oBundle.getText("totalPayHrs"),
				design: "Bold"
			}));

			S.addCell(new sap.m.Label({ //Total field
				textAlign: "Center",
				design: "Bold",
				text: oModel.getData().totalHours
			}));

			for (var iWD = 0; iWD < 7; iWD++) {
				var recordedHrs = data.rowsdata[iWD].sumHours;

				var cell = new sap.m.Label({
					textAlign: "Center",
					design: "Bold",
					text: recordedHrs
				});
				S.addCell(cell);
			}
			this.TotalHrs.addItem(S);
		},
		addEntryinTimeDataModelFromAbsTable: function (AdminTypeKey, itemIndex, mode, newKey) {
			var colhead, coldate, sYear;
			var aggr = this.entryListAbsence.getItems();
			var clmnAts = this.entryListAbsence.getColumns();
			var calendarIntervalStartDate = this.mCalendar.getStartDate();
			var that = this;
			var od = new Date(that.mCalendar.getStartDate());
			var startDate = that.getFirstDayOfWeek(od, that.firstDayOfWeek);
			var endDate = that.getLastDayOfWeek(od, that.firstDayOfWeek);
			var data = this.getModel("TimeData").getData();
			if (mode === "CREATE") {
				var oCells = aggr[itemIndex].getAggregation("cells");
				for (var t = 4; t <= (oCells.length) - 1; t++) {
					if (t === 4) {
						colhead = clmnAts[t].getHeader().getItems()[1].getText();
						sYear = clmnAts[t].getHeader().getItems()[2].getText();
					} else if (t === 5) {
						colhead = clmnAts[t].getHeader().getItems()[1].getText();
						sYear = clmnAts[t].getHeader().getItems()[2].getText();
					} else if (t === 6) {
						colhead = clmnAts[t].getHeader().getItems()[1].getText();
						sYear = clmnAts[t].getHeader().getItems()[2].getText();
					} else if (t === 7) {
						colhead = clmnAts[t].getHeader().getItems()[1].getText();
						sYear = clmnAts[t].getHeader().getItems()[2].getText();
					} else if (t === 8) {
						colhead = clmnAts[t].getHeader().getItems()[1].getText();
						sYear = clmnAts[t].getHeader().getItems()[2].getText();
					} else if (t === 9) {
						colhead = clmnAts[t].getHeader().getItems()[1].getText();
						sYear = clmnAts[t].getHeader().getItems()[2].getText();
					} else if (t === 10) {
						colhead = clmnAts[t].getHeader().getItems()[1].getText();
						sYear = clmnAts[t].getHeader().getItems()[2].getText();
					}

					coldate = sYear + "-" + colhead.split("/")[0] + "-" + colhead.split("/")[1];
					var coldate1 = new Date(coldate);
					coldate1 = new Date(coldate1.getUTCFullYear(), coldate1.getUTCMonth(), coldate1.getUTCDate());
					coldate1.setHours(0);
					coldate1.setMinutes(0);
					coldate1.setSeconds(0);
					coldate1.setMilliseconds(0);
					var recordTemplate = {
						AllowEdit: "",
						AllowRelease: "",
						AssignmentId: "",
						AssignmentName: "",
						CatsDocNo: "",
						Counter: "",
						Pernr: this.empID,
						RefCounter: "",
						RejReason: "",
						Status: "",
						SetDraft: false,
						HeaderData: {
							target: "",
							sum: "0.00",
							//	date: new Date(i),
							date: coldate1,
							addButton: false,
							highlight: false
						},
						target: "",
						TimeEntryDataFields: {
							AENAM: "",
							ALLDF: "",
							APDAT: null,
							APNAM: "",
							ARBID: "00000000",
							ARBPL: "",
							AUERU: "",
							AUFKZ: "",
							AUTYP: "00",
							AWART: AdminTypeKey,
							BEGUZ: "000000",
							BELNR: "",
							BEMOT: "",
							BUDGET_PD: "",
							BUKRS: "",
							BWGRL: "0.0",
							CATSAMOUNT: "0.0",
							CATSHOURS: "0.0",
							CATSQUANTITY: "0.0",
							CPR_EXTID: "",
							CPR_GUID: "",
							CPR_OBJGEXTID: "",
							CPR_OBJGUID: "",
							CPR_OBJTYPE: "",
							ENDUZ: "000000",
							ERNAM: "",
							ERSDA: "",
							ERSTM: "",
							ERUZU: "",
							EXTAPPLICATION: "",
							EXTDOCUMENTNO: "",
							EXTSYSTEM: "",
							FUNC_AREA: "",
							FUND: "",
							GRANT_NBR: "",
							HRBUDGET_PD: "",
							HRCOSTASG: "0",
							HRFUNC_AREA: "",
							HRFUND: "",
							HRGRANT_NBR: "",
							HRKOSTL: "",
							HRLSTAR: "",
							KAPAR: "",
							KAPID: "00000000",
							KOKRS: "",
							LAEDA: "",
							LAETM: "",
							LGART: "",
							LOGSYS: "",
							LONGTEXT: "",
							LONGTEXT_DATA: "",
							LSTAR: "",
							LSTNR: "",
							LTXA1: "",
							MEINH: "",
							OFMNW: "0.0",
							OTYPE: "",
							PAOBJNR: "0000000000",
							PEDD: null,
							PERNR: "00000000",
							PLANS: "00000000",
							POSID: "",
							PRAKN: "",
							PRAKZ: "0000",
							PRICE: "0.0",
							RAPLZL: "00000000",
							RAUFNR: "",
							RAUFPL: "0000000000",
							REASON: "",
							REFCOUNTER: "000000000000",
							REINR: "0000000000",
							RKDAUF: "",
							RKDPOS: "000000",
							RKOSTL: "",
							RKSTR: "",
							RNPLNR: "",
							RPROJ: "00000000",
							RPRZNR: "",
							SBUDGET_PD: "",
							SEBELN: "",
							SEBELP: "00000",
							SKOSTL: "",
							SPLIT: "0",
							SPRZNR: "",
							STATKEYFIG: "",
							STATUS: "",
							S_FUNC_AREA: "",
							S_FUND: "",
							S_GRANT_NBR: "",
							TASKCOMPONENT: "",
							TASKCOUNTER: "",
							TASKLEVEL: "",
							TASKTYPE: "",
							TCURR: "",
							TRFGR: "",
							TRFST: "",
							UNIT: "",
							UVORN: "",
							VERSL: "",
							VORNR: "",
							VTKEN: "",
							WABLNR: "",
							WAERS: "",
							WERKS: "",
							//	WORKDATE: new Date(i),
							WORKDATE: coldate1,
							WORKITEMID: "000000000000",
							WTART: ""
						},
						TimeEntryOperation: ""
					};
					data.push(recordTemplate);
				}
			} else if (mode === "UPDATE") {
				var daterecords = $.grep(data, function (element, index) {
					return element.TimeEntryDataFields.AWART === AdminTypeKey;
				});
				if (daterecords.length) {
					for (var j = 0; j < daterecords.length; j++) {
						daterecords[j].TimeEntryDataFields.AWART = newKey;
					}
				}
			} else if (mode === "DELETE") {
				for (var k = 0; k < data.length; k++) {
					if (data[k].TimeEntryDataFields.AWART === AdminTypeKey) {
						data.splice(k, 1);
						k--;
					}
				}
			}

		},
		onSelectionChangeAbsType: function (oEvent) {
			var that = this;
			oEvent.getSource().close();
			var sSelectedKey = oEvent.getParameters().selectedItem.getKey();
			var tblRows = this.entryListAbsence.getItems();
			var dupEntry = false;
			var iIndex = this.entryListAbsence.indexOfItem(oEvent.getSource().getParent());
			tblRows[iIndex].getCells()[0].setValueState("None");
			var oAdminButton = this.byId("Add_AdminTime");
			if (tblRows.length > 1) {
				for (var i = 0; i < tblRows.length; i++) {
					if (i !== iIndex) {
						if (tblRows[i].getCells()[0].getId().includes("__text")) {
							if (tblRows[i].getCells()[1].getText() === sSelectedKey) {
								dupEntry = true;
								break;
							}
						} else {
							if (tblRows[i].getCells()[0].getSelectedKey() === sSelectedKey) {
								dupEntry = true;
								break;
							}
						}
					}
				}
			}
			if (dupEntry) {
				sap.m.MessageToast.show(this.oBundle.getText("dupentry"));
				tblRows[iIndex].getCells()[0].setSelectedKey(" ");
				tblRows[iIndex].getCells()[0].setValue(" ");
				tblRows[iIndex].getCells()[0].setSelectedItem(null);
				tblRows[iIndex].getCells()[0].setValueState("Error");
				this.enableCellsforEdit(oEvent, false);
				oAdminButton.setEnabled(false);
				if (oEvent.getSource().getCustomData()[0].getValue()) {
					this.addEntryinTimeDataModelFromAbsTable(oEvent.getSource().getCustomData()[0].getValue(), null, "DELETE", null);
				}
				oEvent.getSource().getCustomData()[0].setValue("");
				return;
			}
			if (oEvent.getSource().getCustomData()[0].getValue()) {
				if (oEvent.getSource().getCustomData()[0].getValue() !== sSelectedKey) {
					this.addEntryinTimeDataModelFromAbsTable(oEvent.getSource().getCustomData()[0].getValue(), iIndex, "UPDATE", sSelectedKey);
					oEvent.getSource().getCustomData()[0].setValue(sSelectedKey);
				}

			} else {
				oEvent.getSource().getCustomData()[0].setValue(sSelectedKey);
				this.addEntryinTimeDataModelFromAbsTable(sSelectedKey, iIndex, "CREATE", null);
			}
			oAdminButton.setEnabled(true);
			this.enableCellsforEdit(oEvent, true);
			that.getModel("controls").setProperty("/isDataChanged", true);
			var oCells = tblRows[iIndex].getCells();
			for (var j = 4; j < oCells.length; j++) {
				oCells[j].getItems()[1].attachPress(that.longtextPopover, that);
			}

		},
		enableCellsforEdit: function (oEvent, bType) {
			var that = this;
			var oCells = oEvent.getSource().getParent().getCells();
			for (var t = 4; t <= (oCells.length) - 1; t++) {
				if (bType === true) {
					oCells[t].getItems()[0].setEnabled(true);
				} else {
					oCells[t].getItems()[0].setEnabled(false);
					oCells[t].getItems()[1].detachPress(that.longtextPopover, that);
				}
			}
		},
		onAddAdminTime: function (oEvent) {
			var self = this;
			var dupEntry = false;
			var oPanel = oEvent.getSource().getParent().getParent();
			if (oPanel.getExpanded() === false) {
				oPanel.setExpanded(true);
			}
			var S = new sap.m.ColumnListItem({});
			var tblRows = this.entryListAbsence.getItems();
			var oTableItems = this.entryListAbsence.getItems();
			var cell1 = new sap.m.ComboBox({
				selectedKey: "",
				selectionChange: this.onSelectionChangeAbsType.bind(this),
			}).bindItems({
				path: "/AbsenceTypesSet",
				template: new sap.ui.core.Item({
					key: "{Awart}",
					text: "{Atext}"
				})
			});
			cell1.addCustomData(new sap.ui.core.CustomData({
				key: "AdminType",
				value: ""
			}));
			S.addCell(cell1);
			S.addCell(new sap.m.Text({
				text: "",
			}));
			var cell = new sap.m.HBox({
				items: [
					new sap.ui.core.Icon({
						src: "sap-icon://delete",
						press: function (oEvent) {
							var row = oEvent.getSource().getParent().getParent();
							self.performDeleteRowAbs(row);
						},
						tooltip: "Delete"
					})
				]
			});
			S.addCell(cell);
			S.addCell(new sap.m.Input({ //Total field
				type: "Text",
				textAlign: "Center",
				editable: false,
				value: "00:00",
				//	width: "90%"
			}));
			for (var iWD = 0; iWD < 7; iWD++) {
				var recordedHrs = "";
				var cell = new sap.m.HBox({
					items: [
						new sap.m.Input({
							enabled: false,
							type: "Text",
							textAlign: "Center",
							value: recordedHrs,
							placeholder: "hh:mm",
							liveChange: function (oEvent) {
								if (self._isValidDecimalNumber(this.getValue())) {
									self.validateEntryTime(this);
									self.calculateHours();
								} else {
									this.setValueState(sap.ui.core.ValueState.Error);
									this.getModel("controls").setProperty("/saveEnabled", false);
									this.getModel("controls").setProperty("/submitEnabled", false);
								}
							},
							change: function () {
								var timeEntry = this.getValue();
								if (timeEntry !== "") {
									timeEntry = self.adjustTime(timeEntry);
									this.setValue(timeEntry);
								}
								self.updateTimeEntriesModelFromAbsTable(this);
							}
						}),
						new sap.ui.core.Icon({
							noTabStop: true,
							color: "#0854a0",
							src: "sap-icon://write-new-document",
							tooltip: this.oBundle.getText("additionaldetails"),
						}).addStyleClass("sapUiTinyMarginBegin sapUiTinyMarginTop")

					]

				});
				cell.addCustomData(new sap.ui.core.CustomData({
					key: "HoursAdmin",
					value: recordedHrs
				}));
				S.addCell(cell);
			}
			this.entryListAbsence.addItem(S);
			oEvent.getSource().setEnabled(false);
		},
		addTableRowAbs: function () {
			var self = this;
			var data = this.getModel("aTableRowsAbs").getData();
			var tblRows = this.entryListAbsence.getItems();
			//	var data = this.entryListAbsence.getItems();
			if (data.length !== 0) {
				for (var i = 0; i < data.length; i++) {
					var S = new sap.m.ColumnListItem({});
					var cell1 = new sap.m.Text({
						text: data[i].posidtitle
					});
					cell1.addCustomData(new sap.ui.core.CustomData({
						key: "AdminType",
						value: data[i].admintype
					}));
					S.addCell(cell1);
					S.addCell(new sap.m.Text({
						text: data[i].admintype
					}));

					var cell = new sap.m.HBox({
						items: [
							new sap.ui.core.Icon({
								src: "sap-icon://delete",
								press: function (oEvent) {
									var row = oEvent.getSource().getParent().getParent();
									self.performDeleteRowAbs(row);
								},
								tooltip: "Delete"
							})
						]
					});
					S.addCell(cell);
					S.addCell(new sap.m.Input({ //Total field
						type: "Text",
						textAlign: "Center",
						editable: false,
						value: "00:00",
					}));
					for (var iWD = 0; iWD < data[i].rowsdata.length; iWD++) {
						var recordedHrs = "";
						recordedHrs = data[i].rowsdata[iWD].CATSHOURS;
						var bEnabled = true;
						var sValueState = "None";
						if (data[i].rowsdata[iWD].DayStatus === "DONE") {
							bEnabled = false;
						} else if (data[i].rowsdata[iWD].DayStatus === "REJECTED") {
							sValueState = "Error";
						}
						var cell = new sap.m.HBox({
							items: [
								new sap.m.Input({
									editable: bEnabled,
									type: "Text",
									textAlign: "Center",
									value: recordedHrs,
									valueState: sValueState,
									placeholder: "hh:mm",
									liveChange: function (oEvent) {
										if (self._isValidDecimalNumber(this.getValue())) {
											self.validateEntryTime(this);
											self.calculateHours();
										} else {
											this.setValueState(sap.ui.core.ValueState.Error);
											this.getModel("controls").setProperty("/saveEnabled", false);
											this.getModel("controls").setProperty("/submitEnabled", false);
										}
									},
									change: function () {
										var timeEntry = this.getValue();
										if (timeEntry !== "") {
											timeEntry = self.adjustTime(timeEntry);
											this.setValue(timeEntry);
										}
										self.updateTimeEntriesModelFromAbsTable(this);
									}
								}),
								new sap.ui.core.Icon({
									src: "sap-icon://write-new-document",
									color: "#0854a0",
									tooltip: this.oBundle.getText("additionaldetails"),
									press: this.longtextPopover.bind(this),
									visible: false

								}).addStyleClass("sapUiTinyMarginBegin sapUiTinyMarginTop"),
								new sap.ui.core.Icon({
									src: "sap-icon://notification-2",
									color: "#0854a0",
									tooltip: this.oBundle.getText("comments"),
									press: this.displaylongtextPopover.bind(this),
									visible: false
								}).addStyleClass("sapUiTinyMarginBegin sapUiTinyMarginTop")

							]

						});
						cell.addCustomData(new sap.ui.core.CustomData({
							key: "HoursAdmin",
							value: recordedHrs
						}));
						if (bEnabled) {
							cell.getItems()[1].setVisible(true);
							cell.getItems()[2].setVisible(false);
						} else {
							cell.getItems()[2].setVisible(true);
							cell.getItems()[1].setVisible(false);
						}
						S.addCell(cell);
					}
					this.entryListAbsence.addItem(S);

				}
			}

		},
		addTableRow: function (event) {
			var self = this;
			var dupEntry = false;

			var inputList = this.oConfirmDialog.getContent()[0].getFormContainers()[0].getFormElements();
			var tblRows = this.entryListContents.getItems();
			var sFormSelectedProject = inputList[0].getFields()[0].getSelectedKey();
			var oWorkListModel = this.getModel("Worklist");
			var aWorkListData = oWorkListModel.getData();
			var aRow = aWorkListData.find(function (entry, id) {
				return entry.WorkListDataFields.POSID === sFormSelectedProject;
			});
			//check duplicate entry
			var oTableItems = this.entryListContents.getItems();
			for (var i = 0; i < oTableItems.length; i++) {
				//	if (oTableItems[i].getAggregation("cells")[0].getItems()[0].getTitle().split("(")[1].split(")")[0].trim() === aRow.WorkListDataFields
				//		.POSID.trim()) {
				if (oTableItems[i].getAggregation("cells")[1].getText().trim() === aRow.WorkListDataFields
					.POSID.trim()) {
					dupEntry = true;
					break;
				}
			}
			if (dupEntry) {
				this.pressedItemId = "";
				sap.m.MessageToast.show("project already added");
				return;
			}
			if (aRow) {
				aRow.WorkListDataFields.ZAWART = inputList[2].getFields()[0].getValue().split("(")[1].split(")")[0];
				var sTitle = aRow.WorkListDataFields.ZPOSIDTEXT;
				var sPosId = aRow.WorkListDataFields.POSID;
				// var sText = aRow.WorkListDataFields.CatsxtTaskcomponentText + "," + aRow.WorkListDataFields.CatsxtTasklevelText + "," + aRow.WorkListDataFields
				// 	.CatsxtTasktypeText;
				var sText = this.getForattedsText(aRow);
				var sKey = sFormSelectedProject;
			}
			var S = new sap.m.ColumnListItem({});
			var o = new sap.m.HBox({
				items: [
					new sap.m.ObjectIdentifier({
						title: sTitle,
						text: sText,
						titleActive: true,
						titlePress: function (oevent) {
							self.projectDialogEdit = "X";
							self.onItemSelectGotoEdit(oevent);
							self.onAddAssignment(oevent);
						}
					})
				]
			});
			o.addCustomData(new sap.ui.core.CustomData({
				key: "wbs",
				value: sPosId
			}));
			S.addCell(o);
			S.addCell(new sap.m.Text({
				text: sKey
			}));
			var cell = new sap.m.HBox({
				items: [
					new sap.ui.core.Icon({
						src: "sap-icon://delete",
						press: function (oEvent) {
							var row = oEvent.getSource().getParent().getParent();
							self.performDeleteRow(row);
						},
						tooltip: "Delete"
					})
				]
			});
			cell.addCustomData(new sap.ui.core.CustomData({
				key: "Copied",
				value: false
			}));
			S.addCell(cell);
			S.addCell(new sap.m.Input({ //Total field
				type: "Text",
				textAlign: "Center",
				editable: false,
				value: "00:00",
			}));
			for (var iWD = 0; iWD < 7; iWD++) {
				var recordedHrs = "";
				var cell = new sap.m.FlexBox({
					justifyContent: "Center",
					items: [
						new sap.m.Input({
							type: "Text",
							textAlign: "Center",
							value: recordedHrs,
							placeholder: "hh:mm",
							liveChange: function (oEvent) {
								if (self._isValidDecimalNumber(this.getValue())) {
									self.validateEntryTime(this);
									self.calculateHours();
								} else {
									this.setValueState(sap.ui.core.ValueState.Error);
									this.getModel("controls").setProperty("/saveEnabled", false);
									this.getModel("controls").setProperty("/submitEnabled", false);
								}
							},
							change: function () {
								var timeEntry = this.getValue();
								if (timeEntry !== "") {
									timeEntry = self.adjustTime(timeEntry);
									this.setValue(timeEntry);
								}
								self.updateTimeEntriesModel(this);
							}
						}),
						new sap.ui.core.Icon({
							src: "sap-icon://write-new-document",
							color: "#0854a0",
							tooltip: this.oBundle.getText("additionaldetails"),
							press: this.longtextPopover.bind(this)
						}).addStyleClass("sapUiTinyMarginBegin sapUiTinyMarginTop")

					]

				});

				cell.addCustomData(new sap.ui.core.CustomData({
					key: "Hours",
					value: recordedHrs
				}));
				S.addCell(cell);
			}
			this.entryListContents.addItem(S);
			this.pressedItemId = "";
			this.projectDialogEdit = "";
			this.addEntriesInTimeDataModel(aRow.WorkListDataFields.POSID, aRow.WorkListDataFields.ZATTTEXT.split("(")[1].split(")")[0],
				aRow.WorkListDataFields.TASKCOMPONENT, aRow.WorkListDataFields.Catstasklevel,
				aRow.WorkListDataFields.TASKTYPE);
		},
		addEntriesInTimeDataModel: function (sPosId, sAwart, sTc, sTl, sTt) {
			var that = this;
			var od = new Date(that.mCalendar.getStartDate());
			var startDate = that.getFirstDayOfWeek(od, that.firstDayOfWeek);
			var endDate = that.getLastDayOfWeek(od, that.firstDayOfWeek);
			var data = this.getModel("TimeData").getData();
			for (var i = startDate; i <= endDate; i.setDate(i.getDate() + 1)) {
				startDate.setHours(0);
				startDate.setMinutes(0);
				startDate.setSeconds(0);
				var recordTemplate = {
					AllowEdit: "",
					AllowRelease: "",
					AssignmentId: "",
					AssignmentName: "",
					CatsDocNo: "",
					Counter: "",
					Pernr: this.empID,
					RefCounter: "",
					RejReason: "",
					Status: "",
					SetDraft: false,
					HeaderData: {
						target: "",
						sum: "0.00",
						date: new Date(i),
						addButton: false,
						highlight: false
					},
					target: "",
					TimeEntryDataFields: {
						AENAM: "",
						ALLDF: "",
						APDAT: null,
						APNAM: "",
						ARBID: "00000000",
						ARBPL: "",
						AUERU: "",
						AUFKZ: "",
						AUTYP: "00",
						AWART: sAwart,
						BEGUZ: "000000",
						BELNR: "",
						BEMOT: "",
						BUDGET_PD: "",
						BUKRS: "",
						BWGRL: "0.0",
						CATSAMOUNT: "0.0",
						CATSHOURS: "0.00",
						CATSQUANTITY: "0.0",
						CPR_EXTID: "",
						CPR_GUID: "",
						CPR_OBJGEXTID: "",
						CPR_OBJGUID: "",
						CPR_OBJTYPE: "",
						ENDUZ: "000000",
						ERNAM: "",
						ERSDA: "",
						ERSTM: "",
						ERUZU: "",
						EXTAPPLICATION: "",
						EXTDOCUMENTNO: "",
						EXTSYSTEM: "",
						FUNC_AREA: "",
						FUND: "",
						GRANT_NBR: "",
						HRBUDGET_PD: "",
						HRCOSTASG: "0",
						HRFUNC_AREA: "",
						HRFUND: "",
						HRGRANT_NBR: "",
						HRKOSTL: "",
						HRLSTAR: "",
						KAPAR: "",
						KAPID: "00000000",
						KOKRS: "",
						LAEDA: "",
						LAETM: "",
						LGART: "",
						LOGSYS: "",
						LONGTEXT: "",
						LONGTEXT_DATA: "",
						LSTAR: "",
						LSTNR: "",
						LTXA1: "",
						MEINH: "",
						OFMNW: "0.0",
						OTYPE: "",
						PAOBJNR: "0000000000",
						PEDD: null,
						PERNR: "00000000",
						PLANS: "00000000",
						POSID: sPosId,
						PRAKN: "",
						PRAKZ: "0000",
						PRICE: "0.0",
						ProjTimeCat: "",
						RAPLZL: "00000000",
						RAUFNR: "",
						RAUFPL: "0000000000",
						REASON: "",
						REFCOUNTER: "000000000000",
						REINR: "0000000000",
						RKDAUF: "",
						RKDPOS: "000000",
						RKOSTL: "",
						RKSTR: "",
						RNPLNR: "",
						RPROJ: "00000000",
						RPRZNR: "",
						SBUDGET_PD: "",
						SEBELN: "",
						SEBELP: "00000",
						SKOSTL: "",
						SPLIT: "0",
						SPRZNR: "",
						STATKEYFIG: "",
						STATUS: "",
						S_FUNC_AREA: "",
						S_FUND: "",
						S_GRANT_NBR: "",
						TASKCOMPONENT: sTc,
						TASKCOUNTER: "",
						TASKLEVEL: sTl,
						TASKTYPE: sTt,
						TCURR: "",
						TRFGR: "",
						TRFST: "",
						UNIT: "",
						UVORN: "",
						VERSL: "",
						VORNR: "",
						VTKEN: "",
						WABLNR: "",
						WAERS: "",
						WERKS: "",
						WORKDATE: new Date(i),
						WORKITEMID: "000000000000",
						WrkLoc: "",
						WTART: ""
					},
					TimeEntryOperation: ""
				};
				data.push(recordTemplate);
				startDate = that.getFirstDayOfWeek(od, that.firstDayOfWeek);
			}
			this.getModel("TimeData").refresh();
			startDate = that.getFirstDayOfWeek(od, that.firstDayOfWeek);
		},
		updatePosidForAddedRow: function (sPosId) {
			var coldate, colhead, index = 0,
				sYear;
			var calendarIntervalStartDate = this.mCalendar.getStartDate();
			var data = this.getModel("TimeData").getData();
			var aggr = this.entryListContents.getItems();
			var clmnAts = this.entryListContents.getColumns();
			for (var i = 0; i < aggr.length; i++) {
				if (aggr[i].getCells()[1].getText() === sPosId) {
					index = i;
					break;
				}
			}
			var oCells = aggr[index].getCells();
			for (var t = 4; t <= (oCells.length) - 1; t++) {
				if (t === 4) {
					colhead = clmnAts[t].getHeader().getItems()[1].getText();
					sYear = clmnAts[t].getHeader().getItems()[2].getText();
				} else if (t === 5) {
					colhead = clmnAts[t].getHeader().getItems()[1].getText();
					sYear = clmnAts[t].getHeader().getItems()[2].getText();
				} else if (t === 6) {
					colhead = clmnAts[t].getHeader().getItems()[1].getText();
					sYear = clmnAts[t].getHeader().getItems()[2].getText();
				} else if (t === 7) {
					colhead = clmnAts[t].getHeader().getItems()[1].getText();
					sYear = clmnAts[t].getHeader().getItems()[2].getText();
				} else if (t === 8) {
					colhead = clmnAts[t].getHeader().getItems()[1].getText();
					sYear = clmnAts[t].getHeader().getItems()[2].getText();
				} else if (t === 9) {
					colhead = clmnAts[t].getHeader().getItems()[1].getText();
					sYear = clmnAts[t].getHeader().getItems()[2].getText();
				} else if (t === 10) {
					colhead = clmnAts[t].getHeader().getItems()[1].getText();
					sYear = clmnAts[t].getHeader().getItems()[2].getText();
				}

				coldate = sYear + "-" + colhead.split("/")[0] + "-" + colhead.split("/")[1];
				var coldate1 = new Date(coldate);
				coldate1 = new Date(coldate1.getUTCFullYear(), coldate1.getUTCMonth(), coldate1.getUTCDate());
				coldate1.setHours(0);
				coldate1.setMinutes(0);
				coldate1.setSeconds(0);
				coldate1.setMilliseconds(0);
				for (var l = 0; l < data.length; l++) {
					if (this.oFormatyyyymmdd.format(data[l].TimeEntryDataFields.date) === this.oFormatyyyymmdd.format(coldate1) &&
						!data[l].TimeEntryDataFields.POSID) {
						data[l].TimeEntryDataFields.POSID = sPosId;
						break;
					}
				}
			}

		},
		validateOtherCellChangeMode: function (currentCell) {
			var cellsAggr;
			var bFound = false;
			var aggr = this.entryListContents.getItems();
			for (var aCnt = 0; aCnt < aggr.length; aCnt++) {
				cellsAggr = aggr[aCnt].getAggregation("cells");
				for (var t = 4; t < (cellsAggr.length) - 1; t++) {
					if (cellsAggr[t].getCustomData()[0].getValue() !== cellsAggr[t].getItems()[0].getValue()) {
						bFound = true;
						break;
					}
				}
			}
			return bFound;
		},
		setCellChangeMode: function (cell) {
			if (cell.getCustomData()[0].getValue() === cell.getValue()) {
				this.cellModified = "";
			} else {
				if (this.validateOtherCellChangeMode(cell)) {
					this.cellModified = "X";
				} else {
					this.cellModified = "";
				}

			}
		},

		onItemSelectGotoEdit: function (event) {
			this.pressedItemId = event.getSource().getParent().getParent().getAggregation("cells")[1].getText();

		},
		getTasks: function (initLoad, startDate, endDate) {
			var that = this;
			that.busyDialog.open();
			var oModel = new sap.ui.model.json.JSONModel();
			var TaskModel = new sap.ui.model.json.JSONModel();
			var oControl;
			var obj;
			var TaskFields = [];
			var task = {};
			if (startDate === undefined && endDate === undefined) {
				if (this.dateFrom === undefined) {
					startDate = new Date();
					endDate = new Date();
				} else {
					startDate = this.mCalendar.getMinDate();
					endDate = this.mCalendar.getMaxDate();
				}
			}
			var assignment = {
				"AssignmentId": null,
				"AssignmentName": null
			};
			var groups = [];
			var a = new sap.ui.model.Filter({
				path: "Pernr",
				operator: sap.ui.model.FilterOperator.EQ,
				value1: this.empID
			});
			var b = new sap.ui.model.Filter({
				path: "ValidityStartDate",
				operator: sap.ui.model.FilterOperator.EQ,
				value1: startDate
			});
			var c = new sap.ui.model.Filter({
				path: "ValidityEndDate",
				operator: sap.ui.model.FilterOperator.EQ,
				value1: endDate
			});
			var f = [];
			f.push(b);
			f.push(c);
			f.push(a);
			var mParameters = {
				filters: f,
				urlParameters: '$expand=ToGrps',
				success: function (oData, oResponse) {
					that.tasks = oData.results;
					var date, date1, date2;
					for (var i = 0; i < that.tasks.length; i++) {
						try {
							date1 = new Date(that.tasks[i].ValidityStartDate);
							date2 = new Date(date1.getUTCFullYear(), date1.getUTCMonth(), date1.getUTCDate());
							date = date2;
						} catch (o) {
							date = new Date(that.tasks[i].ValidityStartDate);
						}
						that.tasks[i].ValidityStartDate = date;
						try {
							date1 = new Date(that.tasks[i].ValidityEndDate);
							date2 = new Date(date1.getUTCFullYear(), date1.getUTCMonth(), date1.getUTCDate());
							date = date2;
						} catch (o) {
							date = new Date(that.tasks[i].ValidityEndDate);
						}
						that.tasks[i].ValidityEndDate = date;
					}
					oModel.setData(that.tasks);
					that.setModel(oModel, "Tasks");
					that.setGlobalModel(oModel, "Tasks");
					for (var j = 0; j < that.tasks.length; j++) {
						task["AssignmentName"] = that.tasks[j].AssignmentName;
						for (var k = 0; k < that.tasks[j].ToGrps.results.length; k++) {
							var groupObj = $.grep(groups, function (element, ind) {
								return element.groupId == that.tasks[j].ToGrps.results[k].GrpId;
							});
							if (groupObj.length > 0) {

								var AssignmentObj = $.grep(groupObj[0].Assignments, function (element, ind) {
									return element.AssignmentId == that.tasks[j].AssignmentId;
								});
								if (AssignmentObj.length == 0) {
									var assignment = {
										"AssignmentId": that.tasks[j].AssignmentId,
										"AssignmentName": that.tasks[j].AssignmentName,
										"ValidityStartDate": that.tasks[j].ValidityStartDate,
										"ValidityEndDate": that.tasks[j].ValidityEndDate,
										"Status": that.tasks[j].AssignmentStatus
									};
									groupObj[0].Assignments.push(assignment);
									groupObj[0].count = parseInt(groupObj[0].count) + 1;
								}

							} else if (that.tasks[j].ToGrps.results[k].GrpId && that.tasks[j].ToGrps.results[k].GrpId !== undefined && that.tasks[j].ToGrps
								.results[
									k].GrpId !== "") {
								var group = {
									"groupId": that.tasks[j].ToGrps.results[k].GrpId,
									"groupName": that.tasks[j].ToGrps.results[k].GrpName,
									"count": 1,
									"Assignments": [{
										"AssignmentId": that.tasks[j].AssignmentId,
										"AssignmentName": that.tasks[j].AssignmentName,
										"ValidityStartDate": that.tasks[j].ValidityStartDate,
										"ValidityEndDate": that.tasks[j].ValidityEndDate,
										"Status": that.tasks[j].AssignmentStatus
									}],
								};

								groups.push(group);
							}
						}

						for (var i = 0; i < that.profileFields.length; i++) {
							if (that.profileFields[i].FieldName === "APPROVER" || that.profileFields[i].FieldName === "AssignmentStatus" || that.profileFields[
									i].FieldName === "AssignmentName" || that.profileFields[i].FieldName === "ValidityStartDate" || that.profileFields[i].FieldName ===
								"ValidityEndDate") {
								if (that.profileFields[i].FieldName === "AssignmentStatus") {
									task[that.profileFields[i].FieldName] = that.tasks[j][that.profileFields[i].FieldName] === "1" ? true : false;
								} else if (that.profileFields[i].FieldName === "ValidityStartDate") {
									task[that.profileFields[i].FieldName] = that.tasks[j][that.profileFields[i].FieldName];
								} else if (that.profileFields[i].FieldName === "ValidityEndDate") {
									task[that.profileFields[i].FieldName] = that.tasks[j][that.profileFields[i].FieldName];
								} else if (that.profileFields[i].FieldName === "APPROVER") {
									task["APPROVER"] = that.tasks[j].ApproverId;
								} else {
									task[that.profileFields[i].FieldName] = that.tasks[j][that.profileFields[i].FieldName];
								}
							} else {
								task[that.profileFields[i].FieldName] = that.tasks[j].AssignmentFields[that.profileFields[i].FieldName];
							}

						}
						var finaltask = $.extend(true, {}, task);
						TaskFields.push(finaltask);
					}
					obj = $.grep(TaskFields, function (element, ind) {
						return element.AssignmentStatus === true;
					});
					obj = $.grep(TaskFields, function (element, ind) {
						return element.AssignmentStatus === false;
					});
					TaskModel.setData(TaskFields);
					that.setModel(TaskModel, "TaskFields");
					that.setModel(new JSONModel(groups), "AssignmentGroups");
					var oTasksWithGroups = $.extend(true, [], groups);
					for (var i = 0; i < oTasksWithGroups.length; i++) {
						oTasksWithGroups[i].AssignmentName = oTasksWithGroups[i].groupName;
						oTasksWithGroups[i].AssignmentId = oTasksWithGroups[i].groupId;
						oTasksWithGroups[i].AssignmentType = that.oBundle.getText("group");
						oTasksWithGroups[i].Type = "group";
						oTasksWithGroups[i].AssignmentStatus = "1";
					}
					var oTasks = $.extend(true, [], that.tasks);
					for (var i = 0; i < oTasks.length; i++) {
						oTasks[i].AssignmentType = "";
					}
					var sizeCareModel = new JSONModel();
					if ((oTasks.length + oTasksWithGroups.length) > 100) {
						sizeCareModel.setSizeLimit(500);
					}
					for (var l = 0; l < oTasks.length; l++) {
						oTasks[l].AssignmentId.trim();
					}
					sizeCareModel.setData(oTasksWithGroups.concat(oTasks));
					that.setModel(sizeCareModel, "TasksWithGroups");
					that.busyDialog.close();
				},
				error: function (oError) {
					that.busyDialog.close();
					that.oErrorHandler.processError(oError);
				}
			};
			this.oDataModel.read('/AssignmentCollection', mParameters);
		},
		getProjectDetailF4: function () {
			var that = this;
			this.busyDialog.open();
			var mParameters = {
				success: function (oData, oResponse) {
					that.busyDialog.close();
				},
				error: function (oError) {
					that.busyDialog.close();
					that.oErrorHandler.processError(oError);
				}
			};
			this.oDataModel.read('/ProjectDefinitionSet', mParameters);
		},
		getSwitchInfo: function () {
			var that = this;
			this.busyDialog.open();
			var mParameters = {
				success: function (oData, oResponse) {
					that.busyDialog.close();
					if (oData.results.length) {
						that.getModel("controls").setProperty("/createProjectSwitch", oData.results[0].IsEnabled);
					}
				},
				error: function (oError) {
					that.busyDialog.close();
					that.oErrorHandler.processError(oError);
				}
			};
			this.oDataModel.read('/SwitchSet', mParameters);
		},
		getAbsenceTypes: function () {
			var that = this;
			this.busyDialog.open();
			var mParameters = {
				success: function (oData, oResponse) {
					that.busyDialog.close();
					that.getModel("AdminTypeData").setData(oData.results);
					that.getModel("controls").setProperty("/AdminTypeCount", that.getResourceBundle().getText("projectsnumber", [oData.results.length,
						oData.results
						.length
					]));
					//
				},
				error: function (oError) {
					that.busyDialog.close();
					that.oErrorHandler.processError(oError);
				}
			};
			this.oDataModel.read('/AbsenceTypesSet', mParameters);
		},
		getWorkList: function (startDate, endDate) {
			var that = this;
			var oModel = new JSONModel();
			var oModel_wlist = new JSONModel(); //Note
			var worklist = {};
			var worklistEntry = [];
			var data;
			var f = [];
			var c = new sap.ui.model.Filter({
				path: "WorkListDataFields/ValidityStartDate",
				operator: sap.ui.model.FilterOperator.GE,
				value1: startDate
			});
			var d = new sap.ui.model.Filter({
				path: "WorkListDataFields/ValidityEndDate",
				operator: sap.ui.model.FilterOperator.LE,
				value1: endDate
			});
			f.push(c);
			f.push(d);
			var mParameters = {
				success: function (oData, oResponse) {
					oModel.setData(oData.results);
					var oControl = that.getModel("controls");
					var aArray = [];
					for (var i = 0; i < oData.results.length; i++) {
						oData.results[i].WorkListDataFields.ZAWART = "WRK";
						oData.results[i].WorkListDataFields.ZTASKLEVEL = "";
						oData.results[i].WorkListDataFields.ZPOSIDTEXT = oData.results[i].WorkListDataFields.Post1 + " " + "(" + oData.results[i].WorkListDataFields
							.POSID + ")";
						oData.results[i].WorkListDataFields.ZTCTEXT = oData.results[i].WorkListDataFields.CatsxtTaskcomponentText + "(" + oData.results[
							i].WorkListDataFields.TASKCOMPONENT + ")";
						oData.results[i].WorkListDataFields.ZTLTEXT = oData.results[i].WorkListDataFields.CatsxtTasklevelText + "(" + oData.results[
								i]
							.WorkListDataFields.Catstasklevel + ")";
						oData.results[i].WorkListDataFields.ZTTTEXT = oData.results[i].WorkListDataFields.CatsxtTasktypeText + "(" + oData.results[i]
							.WorkListDataFields
							.TASKTYPE + ")";
						oData.results[i].WorkListDataFields.ZATTTEXT = "01-Work Hours (WRK)";
						// filter projects from work packages
						var object = {
							"Pspid": oData.results[i].WorkListDataFields.Pspid,
							"PspnrChar": oData.results[i].WorkListDataFields.PspnrChar,
							"Post1Proj": oData.results[i].WorkListDataFields.Post1Proj,
							"CombinedText": oData.results[i].WorkListDataFields.Post1Proj + "(" + oData.results[i].WorkListDataFields.Pspid + ")"
						};
						if (aArray.length) {
							var aRow = aArray.find(function (entry, id) {
								return entry.Pspid === object.Pspid;
							});
							if (aRow) {} else {
								aArray.push(object);
							}
						} else {
							aArray.push(object);
						}
						//	aArray.push(object);
					}
					if (aArray.length) {
						aArray = aArray.filter(function (item, index, inputArray) {
							return inputArray.indexOf(item) == index;
						});
						aArray = aArray.filter(function (row, index) {
							return row.Pspid;
						});
					}
					that.getModel("Projects").setData(aArray);
					oModel_wlist.setData(oData.results); //Note

					oControl.setProperty("/worklistCount", that.getResourceBundle().getText("projectsnumber", [aArray.length, aArray.length]));
					if (aArray.length && aArray.length <= 5) {
						oControl.setProperty("/worklistCount1", aArray.length);
					} else {
						oControl.setProperty("/worklistCount1", 5);
					}
					that.getModel("Worklist").setData(oData.results);
					data = oData.results;
					var worklistProfileFields = that.getModel("WorklistProfileFields").getData();
					for (var j = 0; j < data.length; j++) {
						for (var i = 0; i < worklistProfileFields.length; i++) {
							if (data[j].WorkListDataFields[worklistProfileFields[i].FieldName] !== undefined) {
								worklist[worklistProfileFields[i].FieldName] = data[j].WorkListDataFields[worklistProfileFields[i].FieldName];
							} else {
								worklist[worklistProfileFields[i].FieldName] = "";
							}
						}
						var finaltask = $.extend(true, {}, worklist);
						worklistEntry.push(finaltask);
						oModel.setData(worklistEntry);
						that.setModel(oModel, "WorklistFields");
					}
				},
				error: function (oError) {
					that.oErrorHandler.processError(oError);
				},
				filters: f
			};
			this.oDataModel.read('/WorkListCollection', mParameters);

		},
		getTimeEntriesMonthCalendar: function (dateFrom, dateTo) {
			var that = this;
			var oUnifiedCalender = that.getView().byId("idCalendar");
			oUnifiedCalender.setBusy(true);
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
					that.timeEntriesMonth = oData.results;
					oUnifiedCalender.setMinDate(oData.results[0].CaleNavMinDate);
					oUnifiedCalender.setMaxDate(oData.results[0].CaleNavMaxDate);
					var missingDates = $.grep(that.timeEntriesMonth, function (element, index) {
						return element.Status == "MISSING";
					});
					var approvedDates = $.grep(that.timeEntriesMonth, function (element, index) {
						return element.Status == "DONE";
					});
					var rejectedDates = $.grep(that.timeEntriesMonth, function (element, index) {
						return element.Status == "REJECTED";
					});
					var sentDates = $.grep(that.timeEntriesMonth, function (element, index) {
						return element.Status == "FORAPPROVAL";
					});
					var draftDates = $.grep(that.timeEntriesMonth, function (element, index) {
						return element.Status == "DRAFT";
					});
					var nonWorkDates = $.grep(that.timeEntriesMonth, function (element, index) {
						return element.Status == "YACTION";
					});
					that.calendar.removeAllSpecialDates();
					for (var i = 0; i < draftDates.length; i++) {
						var date1 = new Date(draftDates[i].CaleDate.substring(0, 4) + "-" + draftDates[i].CaleDate.substring(4, 6) + "-" +
							draftDates[i].CaleDate.substring(6, 8));
						date1 = new Date(date1.getUTCFullYear(), date1.getUTCMonth(), date1.getUTCDate());
						var date2 = new Date();
						var date2 = new Date(date2.getUTCFullYear(), date2.getUTCMonth(), date2.getUTCDate());
						if (date1 < date2) {
							that.calendar.addSpecialDate(new sap.ui.unified.DateTypeRange({
								startDate: date1,
								type: sap.ui.unified.CalendarDayType.Type01,
								color: "#FFA500",
								tooltip: that.oBundle.getText("timeMissing")
							}));
						} else {
							that.calendar.addSpecialDate(new sap.ui.unified.DateTypeRange({
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
						if (date1 < date2) {
							that.calendar.addSpecialDate(new sap.ui.unified.DateTypeRange({
								startDate: date1,
								type: sap.ui.unified.CalendarDayType.Type01,
								color: "#FFA500",
								tooltip: that.oBundle.getText("timeMissing")
							}));
						} else {
							that.calendar.addSpecialDate(new sap.ui.unified.DateTypeRange({
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
						that.calendar.addSpecialDate(new sap.ui.unified.DateTypeRange({
							startDate: date1,
							type: sap.ui.unified.CalendarDayType.Type04,
							color: "#A7C7E7",
							tooltip: that.oBundle.getText("submitted") + "\n" + sentDates[i].TargetHours.trim() + " " + that.oBundle.getText("hours")
						}));
					}
					for (var i = 0; i < approvedDates.length; i++) {
						var date1 = new Date(approvedDates[i].CaleDate.substring(0, 4) + "-" + approvedDates[i].CaleDate.substring(4, 6) + "-" +
							approvedDates[i].CaleDate.substring(6, 8));
						date1 = new Date(date1.getUTCFullYear(), date1.getUTCMonth(), date1.getUTCDate());
						that.calendar.addSpecialDate(new sap.ui.unified.DateTypeRange({
							startDate: date1,
							type: sap.ui.unified.CalendarDayType.Type08,
							color: "#667C26",
							tooltip: that.oBundle.getText("timeCompleted") + "\n" + approvedDates[i].TargetHours.trim() + " " + that.oBundle.getText(
								"hours")
						}));
					}
					for (var i = 0; i < rejectedDates.length; i++) {
						var date1 = new Date(rejectedDates[i].CaleDate.substring(0, 4) + "-" + rejectedDates[i].CaleDate.substring(4, 6) + "-" +
							rejectedDates[i].CaleDate.substring(6, 8));
						date1 = new Date(date1.getUTCFullYear(), date1.getUTCMonth(), date1.getUTCDate());
						that.calendar.addSpecialDate(new sap.ui.unified.DateTypeRange({
							startDate: date1,
							type: sap.ui.unified.CalendarDayType.Type03,
							color: "#F62217",
							tooltip: that.oBundle.getText("timeRejected") + "\n" + rejectedDates[i].TargetHours.trim() + " " + that.oBundle.getText(
								"hours")
						}));
					}
					if (sap.ui.unified.CalendarDayType.NonWorking !== undefined) {
						for (var i = 0; i < nonWorkDates.length; i++) {
							var date1 = new Date(nonWorkDates[i].CaleDate.substring(0, 4) + "-" + nonWorkDates[i].CaleDate.substring(4, 6) + "-" +
								nonWorkDates[i].CaleDate.substring(6, 8));
							date1 = new Date(date1.getUTCFullYear(), date1.getUTCMonth(), date1.getUTCDate());
							that.calendar.addSpecialDate(new sap.ui.unified.DateTypeRange({
								startDate: date1,
								type: sap.ui.unified.CalendarDayType.NonWorking,
							}));
						}
					}
					oUnifiedCalender.setBusy(false);
				},
				error: function (oError) {
					oUnifiedCalender.setBusy(false);
					that.oErrorHandler.processError(oError);
				}
			};
			this.oDataModel.read('/WorkCalendarCollection', mParameters);
		},
		getFieldTexts: function (oFieldName) {
			var that = this;
			var texts;
			var oModel = new sap.ui.model.json.JSONModel();
			var f = [];
			var c = new sap.ui.model.Filter({
				path: "Pernr",
				operator: sap.ui.model.FilterOperator.EQ,
				value1: this.empID
			});
			var d = new sap.ui.model.Filter({
				path: "FieldName",
				operator: sap.ui.model.FilterOperator.EQ,
				value1: oFieldName
			});
			var e = new sap.ui.model.Filter({
				path: "MaximumHits",
				operator: sap.ui.model.FilterOperator.EQ,
				value1: "10000"
			});
			f.push(c);
			f.push(d);
			f.push(e);
			var mParameters = {
				urlParameters: '$expand=ValueHelpHits',
				filters: f,
				success: function (oData, oResponse) {
					texts = oData.results[0].ValueHelpHits.results;
					oModel.setData(texts);
					that.setModel(oModel, oFieldName);
					that.setGlobalModel(oModel, oFieldName);
				},
				error: function (oError) {
					that.oErrorHandler.processError(oError);
				}
			};
			this.oDataModel.read('/ValueHelpCollection', mParameters);

		},
		getProfileFields: function (empId) {
			var that = this;
			var oModel = new sap.ui.model.json.JSONModel();
			var a = new sap.ui.model.Filter({
				path: "Pernr",
				operator: sap.ui.model.FilterOperator.EQ,
				value1: this.empID
			});

			var f = [];
			f.push(a);
			if (that.profileId) {
				var b = new sap.ui.model.Filter({
					path: "ProfileId",
					operator: sap.ui.model.FilterOperator.EQ,
					value1: that.profileId
				});
				if (that.profileId !== undefined) {
					f.push(b);
				}
			}

			var mParameters = {
				filters: f,
				urlParameters: '$expand=ProfileFields',
				success: function (oData, oResponse) {
					if (oData.results[0].AllowMultipleProfile !== undefined) {
						if (oData.results[0].AllowMultipleProfile === "") {}
					} else {}
					// Remove personnel assignment fields as they are displayed on the top exclusively already
					for (var l = 0; l < oData.results[0].ProfileFields["results"].length; l++) {
						if (oData.results[0].ProfileFields["results"][l].FieldName == "PERASCE" || oData.results[0].ProfileFields["results"][l].FieldName ==
							"PRTXTCE") {
							oData.results[0].ProfileFields["results"].splice(l, 1);
							l--;
						}
					}
					that.profileInfo = $.extend(true, [], oData.results[0]);
					var oControl = that.getModel("controls");
					oControl.setProperty('/submitDraft', oData.results[0].AllowRelease === "TRUE" ? false : true);
					oControl.setProperty('/clockTimeVisible', oData.results[0].AllowClockEntry === "TRUE" ? true : false);
					that.draftStatus = oData.results[0].AllowRelease === "TRUE" ? false : true;
					that.clockTimeVisible = oData.results[0].AllowClockEntry === "TRUE" ? true : false;
					that.hoursDisabled = oData.results[0].HoursDisabled === "TRUE" ? true : false;
					if (that.hoursDisabled) {
						oControl.setProperty('/hoursDisabled', true);
					} else {
						oControl.setProperty('/hoursDisabled', false);
					}
					that.profileFields = $.extend(true, [], oData.results[0].ProfileFields.results);
					var profileFields = $.extend(true, [], oData.results[0].ProfileFields.results);
					for (var i = 0; i < that.profileFields.length; i++) {
						if (that.profileFields[i].DispValueText === "TRUE") {
							that.getFieldTexts(that.profileFields[i].FieldName);
						}
					}
					that.readOnlyTemplate();
					//	that.readOnlyTemplateAdmin();
					var AssignmentNameField = {
						"DefaultValue": "",
						"FieldLabel": that.oBundle.getText("name"),
						"FieldName": "AssignmentName",
						"FieldLength": "00064",
						"HasF4": "X",
						"IsReadOnly": "FALSE",
						"FieldType": "C",
						"Pernr": that.empID,
						"ProfileId": ""
					};
					profileFields.unshift(AssignmentNameField);
					var AssignmentNameField = {
						"DefaultValue": "",
						"FieldLabel": that.oBundle.getText("status"),
						"FieldName": "AssignmentStatus",
						"FieldLength": "00000",
						"HasF4": "",
						"IsReadOnly": "FALSE",
						"Pernr": that.empID,
						"ProfileId": "HR-ONLY",
						"Switch": "true"
					};
					profileFields.push(AssignmentNameField);
					var ValidFromField = {
						"DefaultValue": "",
						"FieldLabel": that.oBundle.getText("validFrom"),
						"FieldName": "ValidityStartDate",
						"HasF4": "X",
						"IsReadOnly": "FALSE",
						"Pernr": that.empID,
					};
					profileFields.push(ValidFromField);
					var ValidToField = {
						"DefaultValue": "",
						"FieldLabel": that.oBundle.getText("validTo"),
						"FieldName": "ValidityEndDate",
						"HasF4": "X",
						"IsReadOnly": "FALSE",
						"Pernr": that.empID,
					};
					profileFields.push(ValidToField);
					var oInitModel = new JSONModel({});
					that.setModel(oInitModel, "ProfileFields");
					that.setGlobalModel(oInitModel, "ProfileFields");
					oModel.setData(profileFields);
					that.profileFields = profileFields;
					that.setModel(oModel, "ProfileFields");
					that.setGlobalModel(oModel, "ProfileFields");
				},
				error: function (oError) {
					that.oErrorHandler.processError(oError);
				}
			};
			this.oDataModel.read('/ProfileInfoCollection', mParameters);
		},
		getTimeEntries: function (dateFrom, dateTo) {
			this.busyDialog.open();
			var that = this;
			var oDate = new Date(this.mCalendar.getStartDate());
			dateFrom = this.getFirstDayOfWeek(oDate, 1);
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
					if (oData.results[0].JoiningDate) {
						var oDate2 = new Date(oData.results[0].JoiningDate.getUTCFullYear(), oData.results[0].JoiningDate.getUTCMonth(),
							oData.results[0].JoiningDate.getUTCDate());
						that.minDate = that.getFirstDayOfWeek(oDate2, 1);
					} else {
						that.minDate = oData.results[0].CaleNavMinDate;
					}
					//	 that.minDate = new Date(1641216800000); // jan3rd 2022 test purpose
					for (var l = 0; l < oData.results.length; l++) {
						//		that.getModel("TimeEntries").getData()[0]["mindate"] = that.minDate; //test purpose
						oData.results[l]["mindate"] = that.minDate;
						if (oData.results[l].TimeEntries.results.length) {
							for (var m = 0; m < oData.results[l].TimeEntries.results.length; m++) {
								var date1 = oData.results[l].TimeEntries.results[m].TimeEntryDataFields.WORKDATE;
								oData.results[l].TimeEntries.results[m].TimeEntryDataFields.WORKDATE = new Date(date1.getUTCFullYear(), date1.getUTCMonth(),
									date1.getUTCDate());
							}
						}
					}
					// if (that.mCalendar.getStartDate().getTime() < oData.results[0].JoiningDate.getTime()) {
					// 	oData.results[0].JoiningDate = null;
					// 	var oDateJoin = new Date(that.oFormatYyyymmdd.format(that.mCalendar.getStartDate()));
					// //	var date = new Date('2021-12-28');
					// 	//oData.results[0].JoiningDate = new Date(date.getUTCFullYear(),date.getUTCMonth(),date.getUTCDate())
					// 	oData.results[0].JoiningDate = oDateJoin;
					// }
					//	oData.results[0].CaleNavMaxDate.setDate(oData.results[0].CaleNavMaxDate.getDate() - 1);
					that.timeEntries = oData.results;
					that.maxDate = oData.results[0].CaleNavMaxDate;
					oModel.setData(that.timeEntries);
					that.setModel(oModel, "TimeEntries");
					if (that.firstDayOfWeek == undefined) {
						that.firstDayOfWeek = formatter.dayOfWeek("MONDAY");
						var curDate = new Date();
						var dateStartDate = that.getFirstDayOfWeek(new Date(), that.firstDayOfWeek);
						that.mCalendar.setStartDate(dateStartDate);
						that.startdate = that.getFirstDayOfWeek(new Date(), that.firstDayOfWeek);
						that.enddate = that.getLastDayOfWeek(new Date(), that.firstDayOfWeek);
					}
					var dateStartDate1 = that.getFirstDayOfWeek(that.mCalendar.getStartDate(), that.firstDayOfWeek);
					that.mCalendar.setStartDate(dateStartDate1);
					var missingDates = $.grep(that.timeEntries, function (element, index) {
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
					that.mCalendar.removeAllSpecialDates();

					for (var i = 0; i < draftDates.length; i++) {
						var date1 = new Date(draftDates[i].CaleDate.substring(0, 4) + "-" + draftDates[i].CaleDate.substring(4, 6) + "-" +
							draftDates[i].CaleDate.substring(6, 8));
						date1 = new Date(date1.getUTCFullYear(), date1.getUTCMonth(), date1.getUTCDate());
						var date2 = new Date();
						var date2 = new Date(date2.getUTCFullYear(), date2.getUTCMonth(), date2.getUTCDate());
						if (date1 < date2) {
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
						if (date1 < date2) {
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
								type: sap.ui.unified.CalendarDayType.NonWorking,
							}));
						}
					}
					that.setIconOverallStatus(approvedDates, rejectedDates, sentDates, draftDates, missingDates);
					if (sap.ui.Device.system.phone === true) {
						that.bindTable1(dateFrom, dateTo);
						that.prepareTableData(that.timeEntries, dateFrom, dateTo, null);
						that.prepareTableDataAbsence(that.timeEntries, dateFrom, dateTo, null);
					} else {
						that.bindTable1(dateFrom, dateTo);
						that.prepareTableData(that.timeEntries, dateFrom, dateTo, null);
						that.prepareTableDataHrs(that.timeEntries, dateFrom, dateTo);
						that.prepareTableDataAbsence(that.timeEntries, dateFrom, dateTo, null);
						that.initializeTable();
						that.initializeTableAbsence();
						that.initializeTableHrs();
						that.addTableData();
						that.addTableRowAbs();
						that.addTableRowHrs();
						that.calculateHours();
						that.fillFooterTextColorProjectTable(that.timeEntries);
						that.fillCellTextColorSummaryTable(that.timeEntries);
					}
					that.busyDialog.close();
				},
				error: function (oError) {
					that.busyDialog.close();
					that.oErrorHandler.processError(oError);
				}
			};
			this.oDataModel.read('/WorkCalendarCollection', mParameters);
		},

		fillCellTextColorSummaryTable: function (data) {
			var that = this;
			var colhead, coldate, sYear;
			var aggr = this.TotalHrs.getItems();
			var clmnAts = this.TotalHrs.getColumns();
			var oDate = new Date(that.mCalendar.getStartDate());
			that.startdate = that.getFirstDayOfWeek(oDate, that.firstDayOfWeek);
			that.enddate = that.getLastDayOfWeek(oDate, that.firstDayOfWeek);
			var calendarIntervalStartDate = this.mCalendar.getStartDate();
			var oCells = aggr[0].getAggregation("cells");
			for (var t = 2; t < (oCells.length) - 2; t++) {
				if (t === 2) {
					colhead = clmnAts[t].getHeader().getItems()[1].getText();
					sYear = clmnAts[t].getHeader().getItems()[2].getText();
				} else if (t === 3) {
					colhead = clmnAts[t].getHeader().getItems()[1].getText();
					sYear = clmnAts[t].getHeader().getItems()[2].getText();
				} else if (t === 4) {
					colhead = clmnAts[t].getHeader().getItems()[1].getText();
					sYear = clmnAts[t].getHeader().getItems()[2].getText();
				} else if (t === 5) {
					colhead = clmnAts[t].getHeader().getItems()[1].getText();
					sYear = clmnAts[t].getHeader().getItems()[2].getText();
				} else if (t === 6) {
					colhead = clmnAts[t].getHeader().getItems()[1].getText();
					sYear = clmnAts[t].getHeader().getItems()[2].getText();
				} else if (t === 7) {
					colhead = clmnAts[t].getHeader().getItems()[1].getText();
					sYear = clmnAts[t].getHeader().getItems()[2].getText();
				} else if (t === 8) {
					colhead = clmnAts[t].getHeader().getItems()[1].getText();
					sYear = clmnAts[t].getHeader().getItems()[2].getText();
				}
				coldate = sYear + "-" + colhead.split("/")[0] + "-" + colhead.split("/")[1];
				var coldate1 = new Date(coldate);
				coldate1 = new Date(coldate1.getUTCFullYear(), coldate1.getUTCMonth(), coldate1.getUTCDate());
				coldate1.setHours(0);
				coldate1.setMinutes(0);
				coldate1.setSeconds(0);
				coldate1.setMilliseconds(0);
				for (var i = 0; i < data.length; i++) {
					var daterecords = $.grep(data, function (element, index) {
						var date = new Date(element.CaleDate.substring(0, 4) + "-" + element.CaleDate.substring(4, 6) + "-" + element.CaleDate.substring(
							6, 8));
						date = new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
						return that.oFormatyyyymmdd.format(date) == that.oFormatyyyymmdd.format(coldate1);
					});
					if (daterecords.length) {
						if (daterecords[0].Status === "MISSING") {
							var date1 = new Date(daterecords[0].CaleDate.substring(0, 4) + "-" + daterecords[0].CaleDate.substring(4, 6) + "-" +
								daterecords[0].CaleDate.substring(6, 8));
							date1 = new Date(date1.getUTCFullYear(), date1.getUTCMonth(), date1.getUTCDate());
							var date2 = new Date();
							var date2 = new Date(date2.getUTCFullYear(), date2.getUTCMonth(), date2.getUTCDate());
							if (date1 < date2) {
								oCells[t].addStyleClass("missingTextColor");
							} else {
								oCells[t].addStyleClass("missingTextColorFuture");
							}
						} else if (daterecords[0].Status === "DONE") {
							oCells[t].addStyleClass("doneTextColor");
						} else if (daterecords[0].Status === "REJECTED") {
							oCells[t].addStyleClass("rejectedTextColor");
						} else if (daterecords[0].Status === "FORAPPROVAL") {
							oCells[t].addStyleClass("forapprovalTextColor");
						} else if (daterecords[0].Status === "DRAFT") {
							var date1 = new Date(daterecords[0].CaleDate.substring(0, 4) + "-" + daterecords[0].CaleDate.substring(4, 6) + "-" +
								daterecords[0].CaleDate.substring(6, 8));
							date1 = new Date(date1.getUTCFullYear(), date1.getUTCMonth(), date1.getUTCDate());
							var date2 = new Date();
							var date2 = new Date(date2.getUTCFullYear(), date2.getUTCMonth(), date2.getUTCDate());
							if (date1 < date2) {
								oCells[t].addStyleClass("missingTextColor");
							} else {
								oCells[t].addStyleClass("missingTextColorFuture");
							}
						}
						break;
					}
				}
			}
		},
		fillFooterTextColorProjectTable: function (data) {
			var that = this;
			var colhead, coldate, colfooter, sYear;
			var clmnAts = this.entryListContents.getColumns();
			var oDate = new Date(that.mCalendar.getStartDate());
			that.startdate = that.getFirstDayOfWeek(oDate, that.firstDayOfWeek);
			that.enddate = that.getLastDayOfWeek(oDate, that.firstDayOfWeek);
			var calendarIntervalStartDate = this.mCalendar.getStartDate();
			for (var t = 4; t <= (clmnAts.length) - 2; t++) {
				if (t === 4) {
					colhead = clmnAts[t].getHeader().getItems()[1].getText();
					sYear = clmnAts[t].getHeader().getItems()[2].getText();
					colfooter = clmnAts[t].getFooter();
				} else if (t === 5) {
					colhead = clmnAts[t].getHeader().getItems()[1].getText();
					sYear = clmnAts[t].getHeader().getItems()[2].getText();
					colfooter = clmnAts[t].getFooter();
				} else if (t === 6) {
					colhead = clmnAts[t].getHeader().getItems()[1].getText();
					sYear = clmnAts[t].getHeader().getItems()[2].getText();
					colfooter = clmnAts[t].getFooter();
				} else if (t === 7) {
					colhead = clmnAts[t].getHeader().getItems()[1].getText();
					sYear = clmnAts[t].getHeader().getItems()[2].getText();
					colfooter = clmnAts[t].getFooter();
				} else if (t === 8) {
					colhead = clmnAts[t].getHeader().getItems()[1].getText();
					sYear = clmnAts[t].getHeader().getItems()[2].getText();
					colfooter = clmnAts[t].getFooter();
				} else if (t === 9) {
					colhead = clmnAts[t].getHeader().getItems()[1].getText();
					sYear = clmnAts[t].getHeader().getItems()[2].getText();
					colfooter = clmnAts[t].getFooter();
				} else if (t === 10) {
					colhead = clmnAts[t].getHeader().getItems()[1].getText();
					sYear = clmnAts[t].getHeader().getItems()[2].getText();
					colfooter = clmnAts[t].getFooter();
				}
				coldate = sYear + "-" + colhead.split("/")[0] + "-" + colhead.split("/")[1];
				var coldate1 = new Date(coldate);
				coldate1 = new Date(coldate1.getUTCFullYear(), coldate1.getUTCMonth(), coldate1.getUTCDate());
				coldate1.setHours(0);
				coldate1.setMinutes(0);
				coldate1.setSeconds(0);
				coldate1.setMilliseconds(0);
				for (var i = 0; i < data.length; i++) {
					var daterecords = $.grep(data, function (element, index) {
						var date = new Date(element.CaleDate.substring(0, 4) + "-" + element.CaleDate.substring(4, 6) + "-" + element.CaleDate.substring(
							6, 8));
						date = new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
						return that.oFormatyyyymmdd.format(date) == that.oFormatyyyymmdd.format(coldate1);
					});
					if (daterecords.length) {
						if (daterecords[0].Status === "MISSING") {
							var date1 = new Date(daterecords[0].CaleDate.substring(0, 4) + "-" + daterecords[0].CaleDate.substring(4, 6) + "-" +
								daterecords[0].CaleDate.substring(6, 8));
							date1 = new Date(date1.getUTCFullYear(), date1.getUTCMonth(), date1.getUTCDate());
							var date2 = new Date();
							var date2 = new Date(date2.getUTCFullYear(), date2.getUTCMonth(), date2.getUTCDate());
							if (date1 < date2) {
								colfooter.addStyleClass("missingTextColor");
							} else {
								colfooter.addStyleClass("missingTextColorFuture");
							}
						} else if (daterecords[0].Status === "DONE") {
							colfooter.addStyleClass("doneTextColor");
						} else if (daterecords[0].Status === "REJECTED") {
							colfooter.addStyleClass("rejectedTextColor");
						} else if (daterecords[0].Status === "FORAPPROVAL") {
							colfooter.addStyleClass("forapprovalTextColor");
						} else if (daterecords[0].Status === "DRAFT") {
							var date1 = new Date(daterecords[0].CaleDate.substring(0, 4) + "-" + daterecords[0].CaleDate.substring(4, 6) + "-" +
								daterecords[0].CaleDate.substring(6, 8));
							date1 = new Date(date1.getUTCFullYear(), date1.getUTCMonth(), date1.getUTCDate());
							var date2 = new Date();
							var date2 = new Date(date2.getUTCFullYear(), date2.getUTCMonth(), date2.getUTCDate());
							if (date1 < date2) {
								colfooter.addStyleClass("missingTextColor");
							} else {
								colfooter.addStyleClass("missingTextColorFuture");
							}
						}
						break;
					}
				}
			}
			//	}

		},
		setIconOverallStatus: function (approvedDates, rejectedDates, sentDates, draftDates, missingDates) {
			var oControl = this.getOwnerComponent().getModel("controls");
			if (approvedDates.length) {
				oControl.setProperty("/overallWeekStatus", "30");
			}
			if (rejectedDates.length) {
				oControl.setProperty("/overallWeekStatus", "40");
			}
			if (sentDates.length) {
				oControl.setProperty("/overallWeekStatus", "20");
			}
			if (draftDates.length || missingDates.length) {
				oControl.setProperty("/overallWeekStatus", "10");
			}
		},
		onCopyPreviousWeek: function (oEvent) {
			var that = this;
			var oDate = new Date(that.mCalendar.getStartDate());
			var oPrevStartDate = this.getPreviousWeekDate(oDate);
			var oPrevEndDate = this.getLastDayOfWeek(oPrevStartDate, 1);
			this.busyDialog.open();
			var oModel = new sap.ui.model.json.JSONModel();
			var a = new sap.ui.model.Filter({
				path: "StartDate",
				operator: sap.ui.model.FilterOperator.EQ,
				value1: this.oFormatYyyymmdd.format(oPrevStartDate)
			});
			var b = new sap.ui.model.Filter({
				path: "EndDate",
				operator: sap.ui.model.FilterOperator.EQ,
				value1: this.oFormatYyyymmdd.format(oPrevEndDate)
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
					for (var l = 0; l < oData.results.length; l++) {
						if (oData.results[l].TimeEntries.results.length) {
							for (var m = 0; m < oData.results[l].TimeEntries.results.length; m++) {
								var date1 = oData.results[l].TimeEntries.results[m].TimeEntryDataFields.WORKDATE;
								oData.results[l].TimeEntries.results[m].TimeEntryDataFields.WORKDATE = new Date(date1.getUTCFullYear(), date1.getUTCMonth(),
									date1.getUTCDate());
							}
						}
					}
					that.timeEntries1 = oData.results;
					oModel.setData(that.timeEntries1);
					that.setModel(oModel, "TimeEntriesCopy");
					that.bindTable2Copy(that.timeEntries1, oPrevStartDate, oPrevEndDate); //fill from timeentriesCopy to   timedataCopy
					oPrevStartDate = that.getPreviousWeekDate(oDate);
					that.prepareTableDataCopy(that.timeEntries1, oPrevStartDate, oPrevEndDate); // to model aTableRowsCopy
					that.busyDialog.close();
				},
				error: function (oError) {
					that.busyDialog.close();
					that.oErrorHandler.processError(oError);
				}
			};
			this.oDataModel.read('/WorkCalendarCollection', mParameters);
		},
		copyDataToaTableRowsModel: function () {
			var that = this;
			var newTimedata = {
				"posid": "",
				"rowsdata": []
			};
			var aTableArray = [];
			var oDataToCopy = $.extend(true, [], this.getModel('aTableRowsCopy').getData());
			var oDate = new Date(that.mCalendar.getStartDate());
			var startDateOriginal = this.getFirstDayOfWeek(oDate, 1);
			var endDateOriginal = this.getLastDayOfWeek(oDate, 1);
			for (var j = 0; j < oDataToCopy.length; j++) {
				for (var i = startDateOriginal; i <= endDateOriginal; i.setDate(i.getDate() + 1)) {
					//	for (var j = 0; j < oDataToCopy.length; j++) {
					newTimedata.posid = oDataToCopy[j].posid;
					for (var k = 0; k < oDataToCopy[j].rowsdata.length; k++) {
						var oExactLastWeekDate = new Date(i.getTime() - 7 * 24 * 60 * 60 * 1000);
						oExactLastWeekDate.setHours(0);
						oExactLastWeekDate.setMinutes(0);
						oExactLastWeekDate.setSeconds(0);
						oExactLastWeekDate.setMilliseconds(0);
						var dateSearch = oDataToCopy[j].rowsdata[k].WORKDATE;
						dateSearch.setHours(0);
						dateSearch.setMinutes(0);
						dateSearch.setSeconds(0);
						dateSearch.setMilliseconds(0);
						if (oExactLastWeekDate.getTime() == dateSearch.getTime()) {
							startDateOriginal.setHours(0);
							startDateOriginal.setMinutes(0);
							startDateOriginal.setSeconds(0);
							oDataToCopy[j].rowsdata[k].WORKDATE = new Date(i);
							oDataToCopy[j].rowsdata[k].Counter = "";
							oDataToCopy[j].rowsdata[k].DayStatus = "";
							oDataToCopy[j].rowsdata[k].CATSQUANTITY = "0.0";
							oDataToCopy[j].rowsdata[k].STATUS = "";
							newTimedata.rowsdata.push(oDataToCopy[j].rowsdata[k]);

						}
					}
				}
				aTableArray.push(newTimedata);
				newTimedata = {
					"posid": "",
					"rowsdata": []
				};
				startDateOriginal = this.getFirstDayOfWeek(oDate, 1);
			}
			if (aTableArray.length) {
				this.totalHoursAndPosId(aTableArray);
			}
			startDateOriginal = this.getFirstDayOfWeek(oDate, 1);
			this.getModel("aTableRows").setData(aTableArray);
			this.getModel("aTableRows").refresh();
			this.setPayTotalHours(aTableArray);

		},
		copyDatafromPrevToCurWeek: function () {
			var that = this;
			var newTimedata = [];
			var oDate = new Date(that.mCalendar.getStartDate());
			var startDateOriginal = this.getFirstDayOfWeek(oDate, 1);
			var endDateOriginal = this.getLastDayOfWeek(oDate, 1);
			var prevWeekEntries = $.extend(true, [], this.getModel('TimeDataCopy').getData());
			for (var i = startDateOriginal; i <= endDateOriginal; i.setDate(i.getDate() + 1)) {
				for (var j = 0; j < prevWeekEntries.length; j++) {
					var oExactLastWeekDate = new Date(i.getTime() - 7 * 24 * 60 * 60 * 1000);
					oExactLastWeekDate.setHours(0);
					oExactLastWeekDate.setMinutes(0);
					oExactLastWeekDate.setSeconds(0);
					oExactLastWeekDate.setMilliseconds(0);
					var dateSearch = prevWeekEntries[j].TimeEntryDataFields.WORKDATE;
					dateSearch.setHours(0);
					dateSearch.setMinutes(0);
					dateSearch.setSeconds(0);
					dateSearch.setMilliseconds(0);
					if (oExactLastWeekDate.getTime() == dateSearch.getTime() && prevWeekEntries[j].TimeEntryDataFields.AWART === "WRK") { //do not copy admin type entries to TimeData Model
						startDateOriginal.setHours(0);
						startDateOriginal.setMinutes(0);
						startDateOriginal.setSeconds(0);
						if (prevWeekEntries[j].TimeEntryDataFields.AWART) {
							var sAwart = prevWeekEntries[j].TimeEntryDataFields.AWART;

						} else {
							sAwart = "WRK";
						}
						if (prevWeekEntries[j].TimeEntryDataFields.POSID) {
							var oWorkListModel = this.getModel("Worklist");
							var aWorkListData = oWorkListModel.getData();
							var aRow = aWorkListData.find(function (entry, id) {
								return entry.WorkListDataFields.POSID === prevWeekEntries[j].TimeEntryDataFields.POSID;
							});
						}
						if (aRow) {
							aRow.WorkListDataFields.ZAWART = prevWeekEntries[j].TimeEntryDataFields.AWART;
						}
						var recordTemplate = {
							AllowEdit: "",
							AllowRelease: "",
							AssignmentId: prevWeekEntries[j].AssignmentId,
							AssignmentName: prevWeekEntries[j].AssignmentName,
							CatsDocNo: "",
							Counter: "",
							Pernr: this.empID,
							RefCounter: "",
							RejReason: "",
							Status: "",
							SetDraft: false,
							HeaderData: {
								target: prevWeekEntries[j].HeaderData.target,
								sum: prevWeekEntries[j].HeaderData.sum,
								date: new Date(i),
								addButton: false,
								highlight: false
							},
							//		target: daterecords[0].TargetHours,
							TimeEntryDataFields: {
								AENAM: "",
								ALLDF: "",
								APDAT: null,
								APNAM: "",
								ARBID: "00000000",
								ARBPL: "",
								AUERU: "",
								AUFKZ: "",
								AUTYP: "00",
								AWART: sAwart, //need to fill from prev week entry
								BEGUZ: "000000",
								BELNR: "",
								BEMOT: "",
								BUDGET_PD: "",
								BUKRS: "",
								BWGRL: "0.0",
								CATSAMOUNT: "0.0", //need to fill from prev week entry
								CATSHOURS: prevWeekEntries[j].TimeEntryDataFields.CATSHOURS, //need to fill from prev week entry
								CATSQUANTITY: "0.0", //need to fill from prev week entry
								CPR_EXTID: "",
								CPR_GUID: "",
								CPR_OBJGEXTID: "",
								CPR_OBJGUID: "",
								CPR_OBJTYPE: "",
								ENDUZ: "000000",
								ERNAM: "",
								ERSDA: "",
								ERSTM: "",
								ERUZU: "",
								EXTAPPLICATION: "",
								EXTDOCUMENTNO: "",
								EXTSYSTEM: "",
								FUNC_AREA: "",
								FUND: "",
								GRANT_NBR: "",
								HRBUDGET_PD: "",
								HRCOSTASG: "0",
								HRFUNC_AREA: "",
								HRFUND: "",
								HRGRANT_NBR: "",
								HRKOSTL: "",
								HRLSTAR: "",
								KAPAR: "",
								KAPID: "00000000",
								KOKRS: "",
								LAEDA: "",
								LAETM: "",
								LGART: "",
								LOGSYS: "",
								LONGTEXT: prevWeekEntries[j].TimeEntryDataFields.LONGTEXT, //need to fill from prev week entry
								LONGTEXT_DATA: prevWeekEntries[j].TimeEntryDataFields.LONGTEXT_DATA, //need to fill from prev week entry
								LSTAR: prevWeekEntries[j].TimeEntryDataFields.LSTAR, //need to fill from prev week entry
								LSTNR: "",
								LTXA1: "",
								MEINH: "",
								OFMNW: "0.0",
								OTYPE: "",
								PAOBJNR: "0000000000",
								PEDD: null,
								PERNR: "00000000",
								PLANS: "00000000",
								POSID: prevWeekEntries[j].TimeEntryDataFields.POSID, //need to fill from prev week entry
								PRAKN: "",
								PRAKZ: "0000",
								PRICE: "0.0",
								RAPLZL: "00000000",
								RAUFNR: "",
								RAUFPL: "0000000000",
								REASON: "",
								REFCOUNTER: "000000000000",
								REINR: "0000000000",
								RKDAUF: "",
								RKDPOS: "000000",
								RKOSTL: "",
								RKSTR: "",
								RNPLNR: "",
								RPROJ: "00000000",
								RPRZNR: "",
								SBUDGET_PD: "",
								SEBELN: "",
								SEBELP: "00000",
								SKOSTL: "",
								SPLIT: "0",
								SPRZNR: "",
								STATKEYFIG: "",
								STATUS: "",
								S_FUNC_AREA: "",
								S_FUND: "",
								S_GRANT_NBR: "",
								TASKCOMPONENT: prevWeekEntries[j].TimeEntryDataFields.TASKCOMPONENT, //need to fill from prev week entry
								TASKCOUNTER: "",
								TASKLEVEL: prevWeekEntries[j].TimeEntryDataFields.TASKLEVEL, //need to fill from prev week entry
								TASKTYPE: prevWeekEntries[j].TimeEntryDataFields.TASKTYPE, //need to fill from prev week entry
								TCURR: "",
								TRFGR: "",
								TRFST: "",
								UNIT: "", //need to fill from prev week entry
								UVORN: "",
								VERSL: "",
								VORNR: "",
								VTKEN: "",
								WABLNR: "",
								WAERS: "",
								WERKS: "",
								WORKDATE: new Date(i),
								WORKITEMID: "000000000000",
								WTART: ""
							},
							TimeEntryOperation: "C"
						};
						recordTemplate.totalHours = prevWeekEntries[j].totalHours;
						recordTemplate.addButton = prevWeekEntries[j].addButton;
						recordTemplate.HeaderData.deleteButton = prevWeekEntries[j].deleteButton;
						recordTemplate.addButtonEnable = prevWeekEntries[j].addButtonEnable;
						recordTemplate.deleteButtonEnable = prevWeekEntries[j].deleteButtonEnable;
						recordTemplate.totalHours = "0.00";
						recordTemplate.target = prevWeekEntries[j].target;
						newTimedata.push(recordTemplate);
					}
				}

			}
			startDateOriginal = this.getFirstDayOfWeek(oDate, 1);
			var oModel = this.getModel('TimeData');
			var oData = oModel.getData();
			if (sap.ui.Device.system.phone !== true) {
				if (oData.length) {
					this.removeProjectTableItems();
					if (this.getModel('TimeData').getData().length) {
						for (var j = newTimedata.length - 1; j >= 0; j--) {
							oData.unshift(newTimedata[j]);
						}
						oModel.setData(oData);
					} else {
						oModel.setData(newTimedata);
					}

				} else {
					oModel.setData(newTimedata);
				}
			} else {
				oModel.setData(newTimedata);
			}
			this.setModel(oModel, "TimeData");
			this.getModel("controls").setProperty("/isDataChanged", true);
		},
		prepareTableDataCopyPhone: function (data, startDate, endDate) {

		},
		prepareTableDataCopy: function (data, startDate, endDate) {
			var that = this;
			var oDate = new Date(that.mCalendar.getStartDate());
			var startDateOriginal = this.getFirstDayOfWeek(oDate, 1);
			var endDateOriginal = this.getLastDayOfWeek(oDate, 1);
			var entries = $.extend(true, [], this.getModel('TimeEntriesCopy').getData());
			var oModel = new sap.ui.model.json.JSONModel();
			if (sap.ui.Device.system.phone === true) {
				var oItems = that.getView().byId("ENTRY_LIST_CONTENTS_Phone").getItems();
			} else {
				oItems = that.entryListContents.getItems();
			}
			var aPosIds = [];
			var aTableRecords = {
				"posid": "",
				"rowsdata": []
			};
			var aTableArray = [];
			for (var i = 0; i < data.length; i++) {
				if (data[i].TimeEntries.results.length !== 0) {
					for (var j = 0; j < data[i].TimeEntries.results.length; j++) {
						aPosIds.push(data[i].TimeEntries.results[j].TimeEntryDataFields.POSID);
					}
				}
			}
			aPosIds = aPosIds.filter(function (item, index, inputArray) {
				return inputArray.indexOf(item) == index && inputArray.indexOf(item) !== "";
			});
			aPosIds = aPosIds.filter(function (row, index) {
				return row;
			});
			var oControl = this.getModel("controls");

			if (aPosIds.length) {
				if (oItems.length) {
					var sText = this.getResourceBundle().getText("overwriteData");
					var sConfirmTitle = this.getResourceBundle().getText("confirm");
					var sResponsivePaddingClasses =
						"sapUiResponsivePadding--header sapUiResponsivePadding--content sapUiResponsivePadding--footer";
					sap.m.MessageBox.confirm(sText, {
						icon: sap.m.MessageBox.Icon.QUESTION,
						title: sConfirmTitle, // default
						styleClass: sResponsivePaddingClasses, // default
						actions: [sap.m.MessageBox.Action.OK,
							sap.m.MessageBox.Action.CANCEL
						], // default
						emphasizedAction: sap.m.MessageBox.Action.OK, // default
						initialFocus: sap.m.MessageBox.Action.CANCEL, // default
						onClose: function (oAction) {
							if (oAction === "OK") {
								that.performDeleteRows(that.entryListContents);
								for (var k = 0; k < aPosIds.length; k++) {
									aTableRecords.posid = aPosIds[k];
									for (var i = startDate; i <= endDate; i.setDate(i.getDate() + 1)) {
										var dateSearch = i;
										var daterecords = $.grep(entries, function (element, index) {
											var date = new Date(element.CaleDate.substring(0, 4) + "-" + element.CaleDate.substring(4, 6) + "-" + element.CaleDate
												.substring(
													6, 8));
											date = new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
											return that.oFormatyyyymmdd.format(date) == that.oFormatyyyymmdd.format(dateSearch) && element.Status !== '99';
										});
										if (daterecords.length === 0) {
											continue;
										}
										if (daterecords[0].TimeEntries.results.length !== 0) {
											for (var j = 0; j < daterecords[0].TimeEntries.results.length; j++) {
												var aRow = daterecords[0].TimeEntries.results.find(function (entry, id) {
													return entry.TimeEntryDataFields.POSID === aPosIds[k];
												});
												if (aRow) {
													var iNum;
													var sValue1 = parseInt(aRow.TimeEntryDataFields.CATSHOURS.split(".")[0]);
													var sValue2 = aRow.TimeEntryDataFields.CATSHOURS.split(".")[1];
													if (sValue1) {
														if (sValue1 <= 9) {
															iNum = "0" + sValue1 + ":" + sValue2;
														}
													}
													var sTime = parseFloat(aRow.TimeEntryDataFields.CATSHOURS.trim());
													var sHours = Math.floor(sTime);
													var sHours1 = Math.floor(sTime).toString();
													var sMinutes = Math.round((sTime - sHours) * 60).toString();
													if (sHours1.length === 1) {
														sHours1 = "0" + sHours1;
													}
													if (sMinutes.length === 1) {
														sMinutes = "0" + sMinutes;
													}
													aRow.TimeEntryDataFields.CATSHOURS = sHours1 + ":" + sMinutes;
													aTableRecords.rowsdata.push(aRow.TimeEntryDataFields);
													aTableRecords.rowsdata[0].Counter = aRow.Counter;
													aTableRecords.rowsdata[0].DayStatus = daterecords[0].Status;
													aTableRecords.rowsdata[0].RejReason = aRow.RejReason;
													aTableRecords.rowsdata[0].RejReasondesc = aRow.RejReasondesc;
													// Added as part of enabling and disabling based on AllowEdit
													aTableRecords.rowsdata[0].AllowEdit = aRow.AllowEdit;
												} else {
													var date1 = new Date(daterecords[0].CaleDate.substring(0, 4) + "-" + daterecords[0].CaleDate.substring(4, 6) +
														"-" +
														daterecords[0].CaleDate.substring(6, 8));
													date1 = new Date(date1.getUTCFullYear(), date1.getUTCMonth(), date1.getUTCDate());
													aTableRecords.rowsdata.push({
														//	 oObj={
														"Counter": "",
														"CATSHOURS": "0:00",
														"DayStatus": "",
														"WORKDATE": date1,
														"LONGTEXT_DATA": "",
														"LONGTEXT": "",
														"RejReason": "",
														"RejReasondesc": "",
														"STATUS": ""
													});
												}
												if (aTableArray.length && aTableArray[k]) {
													if (aTableArray[k].rowsdata) {
														aTableArray[k].rowsdata.push(aTableRecords.rowsdata[0]);
													}
												} else {
													aTableArray.push(aTableRecords);
												}
												aTableRecords = {
													"posid": "",
													"rowsdata": []
												};
												break;
											}
										} else {
											var date1 = new Date(daterecords[0].CaleDate.substring(0, 4) + "-" + daterecords[0].CaleDate.substring(4, 6) +
												"-" +
												daterecords[0].CaleDate.substring(6, 8));
											date1 = new Date(date1.getUTCFullYear(), date1.getUTCMonth(), date1.getUTCDate());
											aTableRecords.rowsdata.push({
												//	 oObj={
												"Counter": "",
												"CATSHOURS": "0:00",
												"DayStatus": "",
												"WORKDATE": date1,
												"LONGTEXT_DATA": "",
												"LONGTEXT": "",
												"RejReason": "",
												"RejReasondesc": "",
												"STATUS": ""
											});
											if (aTableArray.length && aTableArray[k]) {
												if (aTableArray[k].rowsdata) {
													aTableArray[k].rowsdata.push(aTableRecords.rowsdata[0]);
												}
											} else {
												aTableArray.push(aTableRecords);
											}
											aTableRecords = {
												"posid": "",
												"rowsdata": []
											};

										}

									}
									startDate = that.getFirstDayOfWeek(endDate, 1);
									startDate.setHours(0);
									startDate.setMinutes(0);
									startDate.setSeconds(0);
									startDate.setMilliseconds(0);
								}
								startDate = that.getFirstDayOfWeek(endDate, 1);
								startDate.setHours(0);
								startDate.setMinutes(0);
								startDate.setSeconds(0);
								startDate.setMilliseconds(0);

								oModel.setData(aTableArray);
								if (aTableArray.length) {
									this.setModel(oModel, "aTableRowsCopy");
									oControl.setProperty("/entryCopied", true);
									oControl.setProperty("/prevWeekBut", false);

								}
								that.copyDatafromPrevToCurWeek(startDateOriginal, endDateOriginal); // from timedatacopy to TimeData
								if (sap.ui.Device.system.phone !== true) {
									that.addTableDataCopy();
									that.calculateHours();
								} else {
									that.copyDataToaTableRowsModel(startDateOriginal, endDateOriginal); // from aTableRowsCopy to aTableRows
								}
							} else {
								oControl.setProperty("/entryCopied", false);
							}
						}.bind(this)
					});
				} else {
					for (var k = 0; k < aPosIds.length; k++) {
						aTableRecords.posid = aPosIds[k];
						for (var i = startDate; i <= endDate; i.setDate(i.getDate() + 1)) {
							var dateSearch = i;
							var daterecords = $.grep(entries, function (element, index) {
								var date = new Date(element.CaleDate.substring(0, 4) + "-" + element.CaleDate.substring(4, 6) + "-" + element.CaleDate
									.substring(
										6, 8));
								date = new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
								return that.oFormatyyyymmdd.format(date) == that.oFormatyyyymmdd.format(dateSearch) && element.Status !== '99';
							});
							if (daterecords.length === 0) {
								continue;
							}
							if (daterecords[0].TimeEntries.results.length !== 0) {
								for (var j = 0; j < daterecords[0].TimeEntries.results.length; j++) {
									var aRow = daterecords[0].TimeEntries.results.find(function (entry, id) {
										return entry.TimeEntryDataFields.POSID === aPosIds[k];
									});
									if (aRow) {
										var iNum;
										var sValue1 = parseInt(aRow.TimeEntryDataFields.CATSHOURS.split(".")[0]);
										var sValue2 = aRow.TimeEntryDataFields.CATSHOURS.split(".")[1];
										if (sValue1) {
											if (sValue1 <= 9) {
												iNum = "0" + sValue1 + ":" + sValue2;
											}
										}
										var sTime = parseFloat(aRow.TimeEntryDataFields.CATSHOURS.trim());
										var sHours = Math.floor(sTime);
										var sHours1 = Math.floor(sTime).toString();
										var sMinutes = Math.round((sTime - sHours) * 60).toString();
										if (sHours1.length === 1) {
											sHours1 = "0" + sHours1;
										}
										if (sMinutes.length === 1) {
											sMinutes = "0" + sMinutes;
										}
										aRow.TimeEntryDataFields.CATSHOURS = sHours1 + ":" + sMinutes;
										aTableRecords.rowsdata.push(aRow.TimeEntryDataFields);
										aTableRecords.rowsdata[0].Counter = aRow.Counter;
										aTableRecords.rowsdata[0].DayStatus = daterecords[0].Status;
										aTableRecords.rowsdata[0].RejReason = aRow.RejReason;
										aTableRecords.rowsdata[0].RejReasondesc = aRow.RejReasondesc;
										// Added as part of enabling and disabling based on AllowEdit
										aTableRecords.rowsdata[0].AllowEdit = aRow.AllowEdit;
									} else {
										var date1 = new Date(daterecords[0].CaleDate.substring(0, 4) + "-" + daterecords[0].CaleDate.substring(4, 6) + "-" +
											daterecords[0].CaleDate.substring(6, 8));
										date1 = new Date(date1.getUTCFullYear(), date1.getUTCMonth(), date1.getUTCDate());
										aTableRecords.rowsdata.push({
											//	 oObj={
											"Counter": "",
											"CATSHOURS": "0:00",
											"DayStatus": "",
											"WORKDATE": date1,
											"LONGTEXT_DATA": "",
											"LONGTEXT": "",
											"RejReason": "",
											"RejReasondesc": "",
											"STATUS": ""
										});
									}
									if (aTableArray.length && aTableArray[k]) {
										if (aTableArray[k].rowsdata) {
											aTableArray[k].rowsdata.push(aTableRecords.rowsdata[0]);
										}
									} else {
										aTableArray.push(aTableRecords);
									}
									aTableRecords = {
										"posid": "",
										"rowsdata": []
									};
									break;
								}
							} else {
								var date1 = new Date(daterecords[0].CaleDate.substring(0, 4) + "-" + daterecords[0].CaleDate.substring(4, 6) + "-" +
									daterecords[0].CaleDate.substring(6, 8));
								date1 = new Date(date1.getUTCFullYear(), date1.getUTCMonth(), date1.getUTCDate());
								aTableRecords.rowsdata.push({
									//	 oObj={
									"Counter": "",
									"CATSHOURS": "0:00",
									"DayStatus": "",
									"WORKDATE": date1,
									"LONGTEXT_DATA": "",
									"LONGTEXT": "",
									"RejReason": "",
									"RejReasondesc": "",
									"STATUS": ""
								});
								if (aTableArray.length && aTableArray[k]) {
									if (aTableArray[k].rowsdata) {
										aTableArray[k].rowsdata.push(aTableRecords.rowsdata[0]);
									}
								} else {
									aTableArray.push(aTableRecords);
								}
								aTableRecords = {
									"posid": "",
									"rowsdata": []
								};

							}

						}
						startDate = that.getFirstDayOfWeek(endDate, 1);
						startDate.setHours(0);
						startDate.setMinutes(0);
						startDate.setSeconds(0);
						startDate.setMilliseconds(0);
					}
					startDate = that.getFirstDayOfWeek(endDate, 1);
					startDate.setHours(0);
					startDate.setMinutes(0);
					startDate.setSeconds(0);
					startDate.setMilliseconds(0);

					oModel.setData(aTableArray);
					if (aTableArray.length) {
						this.setModel(oModel, "aTableRowsCopy");
						oControl.setProperty("/entryCopied", true);
					}
					that.copyDatafromPrevToCurWeek(startDateOriginal, endDateOriginal); // from timedatacopy to TimeData
					if (sap.ui.Device.system.phone !== true) {
						that.addTableDataCopy();
						that.calculateHours();
					} else {
						that.copyDataToaTableRowsModel(startDateOriginal, endDateOriginal); // from aTableRowsCopy to aTableRows
					}
					//	this.byId("idPreviousWeek").setVisible(false);
					that.getModel("controls").setProperty("/prevWeekBut", false);
				}
			} else {
				oControl.setProperty("/entryCopied", false);
				var toastMsg = that.getResourceBundle().getText("noDataPrevWeek");
				sap.m.MessageToast.show(toastMsg, {
					//	duration: 3000
				});
				return;
			}
		},
		addTableDataCopy: function () {
			var self = this;
			var dupFound = false;
			var aExistingData = this.getModel("aTableRowsCopy").getData();
			var data = this.getModel("TimeData").getData();
			if (aExistingData.length !== 0) {
				for (var i = 0; i < aExistingData.length; i++) {
					var sKey = aExistingData[i].posid;
					var oWorkListModel = this.getModel("Worklist");
					var aWorkListData = oWorkListModel.getData();
					var aRow = aWorkListData.find(function (entry, id) {
						return entry.WorkListDataFields.POSID === sKey;
					});
					if (aRow) {
						var sTitle = aRow.WorkListDataFields.ZPOSIDTEXT;
						var sPosId = aRow.WorkListDataFields.POSID;
						// var sText = aRow.WorkListDataFields.CatsxtTaskcomponentText + "," + aRow.WorkListDataFields.CatsxtTasklevelText + "," +
						// 	aRow.WorkListDataFields
						// 	.CatsxtTasktypeText; // + "," + "Denver, CO";
						var sText = this.getForattedsText(aRow);
					} else {
						sTitle = sKey;
						sPosId = sKey;
						sText = sKey; // + "," + "Denver, CO";
					}
					var oWorklistModelData = this.getModel("WorklistFields").getData();
					var aRow1 = oWorklistModelData.find(function (entry, id) {
						return entry.POSID === sKey;
					});
					if (aRow1) {
						aRow.WorkListDataFields.ZTASKLEVEL = aRow1.TASKLEVEL;
					} else {}
					var S = new sap.m.ColumnListItem({});
					var o = new sap.m.HBox({
						items: [
							new sap.m.ObjectIdentifier({
								//title: this.newEntry.mainItem,
								title: sTitle,
								text: sText,
								titleActive: true,
								titlePress: function (oevent) {
									self.projectDialogEdit = "X";
									self.onItemSelectGotoEdit(oevent);
									self.onAddAssignment(oevent);
								}
							})
						]
					});
					o.addCustomData(new sap.ui.core.CustomData({
						key: "wbs",
						value: sPosId
					}));
					S.addCell(o);
					S.addCell(new sap.m.Text({
						text: sPosId
					}));
					var cell = new sap.m.HBox({
						items: [

							new sap.ui.core.Icon({
								//enabled: true,
								src: "sap-icon://delete",
								press: function (oEvent) {
									var row = oEvent.getSource().getParent().getParent();
									self.performDeleteRow(row);
								},
								tooltip: "Delete"
							})
						]
					});
					cell.addCustomData(new sap.ui.core.CustomData({
						key: "Copied",
						value: true
					}));
					S.addCell(cell);
					S.addCell(new sap.m.Input({ //Total field
						type: "Text",
						textAlign: "Center",
						editable: false,
						value: "00:00",
					}));
					for (var iWD = 0; iWD < aExistingData[i].rowsdata.length; iWD++) {
						var recordedHrs = "";
						recordedHrs = aExistingData[i].rowsdata[iWD].CATSHOURS;
						if (aRow && aExistingData[i].rowsdata[iWD].AWART) {
							aRow.WorkListDataFields.ZAWART = aExistingData[i].rowsdata[iWD].AWART;
							oWorkListModel.refresh(true);
						}
						var bEnabled = true;
						var sValueState = "None";
						var cell = new sap.m.FlexBox({
							justifyContent: "Center",
							items: [
								new sap.m.Input({
									valueState: sValueState,
									type: "Text",
									textAlign: "Center",
									value: recordedHrs,
									editable: bEnabled,
									liveChange: function (oEvent) {
										if (self._isValidDecimalNumber(this.getValue())) {
											self.validateEntryTime(this);
											self.calculateHours();
										} else {
											this.setValueState(sap.ui.core.ValueState.Error);
											this.getModel("controls").setProperty("/saveEnabled", false);
											this.getModel("controls").setProperty("/submitEnabled", false);
										}
									},
									change: function () {
										var timeEntry = this.getValue();
										if (timeEntry !== "") {
											timeEntry = self.adjustTime(timeEntry);
											this.setValue(timeEntry);
										}
										self.updateTimeEntriesModel(this);
									}
								}),
								new sap.ui.core.Icon({
									src: "sap-icon://write-new-document",
									color: "#0854a0",
									//	type: sap.m.ButtonType.Transparent,
									tooltip: this.oBundle.getText("additionaldetails"),
									press: this.longtextPopover.bind(this),
									visible: true

								}).addStyleClass("sapUiTinyMarginBegin sapUiTinyMarginTop"),
								new sap.ui.core.Icon({
									src: "sap-icon://notification-2",
									color: "#0854a0",
									tooltip: this.oBundle.getText("comments"),
									press: this.displaylongtextPopover.bind(this),
									visible: false
								}).addStyleClass("sapUiTinyMarginBegin sapUiTinyMarginTop")

							]

						});

						cell.addCustomData(new sap.ui.core.CustomData({
							key: "Hours",
							value: recordedHrs
						}));
						S.addCell(cell);
					}
					this.entryListContents.addItem(S);
				}
			}
		},
		copyPosidCatsHourInTimeDataModel: function () {
			var aExistingData = this.getModel("aTableRowsCopy").getData();
			var colhead, sYear, coldate1, coldate, iNum;
			var data = this.getModel("TimeData").getData();
			var aggr = this.entryListContents.getItems();
			var clmnAts = this.entryListContents.getColumns();
			var oWorkListModel = this.getModel("Worklist");
			var aWorkListData = oWorkListModel.getData();
			for (var u = 0; u < aggr.length; u++) {
				var oCells = aggr[u].getAggregation("cells");
				var sPosid = oCells[1].getText();
				for (var t = 4; t <= (oCells.length) - 1; t++) {
					if (t === 4) {
						colhead = clmnAts[t].getHeader().getItems()[1].getText();
						sYear = clmnAts[t].getHeader().getItems()[2].getText();
						iNum = oCells[t].getItems()[0].getValue();
					} else if (t === 5) {
						colhead = clmnAts[t].getHeader().getItems()[1].getText();
						sYear = clmnAts[t].getHeader().getItems()[2].getText();
						iNum = oCells[t].getItems()[0].getValue();
					} else if (t === 6) {
						colhead = clmnAts[t].getHeader().getItems()[1].getText();
						sYear = clmnAts[t].getHeader().getItems()[2].getText();
						iNum = oCells[t].getItems()[0].getValue();
					} else if (t === 7) {
						colhead = clmnAts[t].getHeader().getItems()[1].getText();
						sYear = clmnAts[t].getHeader().getItems()[2].getText();
						iNum = oCells[t].getItems()[0].getValue();
					} else if (t === 8) {
						colhead = clmnAts[t].getHeader().getItems()[1].getText();
						sYear = clmnAts[t].getHeader().getItems()[2].getText();
						iNum = oCells[t].getItems()[0].getValue();
					} else if (t === 9) {
						colhead = clmnAts[t].getHeader().getItems()[1].getText();
						sYear = clmnAts[t].getHeader().getItems()[2].getText();
						iNum = oCells[t].getItems()[0].getValue();
					} else if (t === 10) {
						colhead = clmnAts[t].getHeader().getItems()[1].getText();
						sYear = clmnAts[t].getHeader().getItems()[2].getText();
						iNum = oCells[t].getItems()[0].getValue();
					}
					coldate = sYear + "-" + colhead.split("/")[0] + "-" + colhead.split("/")[1];
					coldate1 = new Date(coldate);
					coldate1 = new Date(coldate1.getUTCFullYear(), coldate1.getUTCMonth(), coldate1.getUTCDate());
					coldate1.setHours(0);
					coldate1.setMinutes(0);
					coldate1.setSeconds(0);
					coldate1.setMilliseconds(0);
					for (var l = 0; l < data.length; l++) {
						if (this.oFormatyyyymmdd.format(data[l].TimeEntryDataFields.WORKDATE) === this.oFormatyyyymmdd.format(coldate1) && data[l]
							.TimeEntryDataFields
							.AWART === "WRK") {
							var record = data[l];
							break;
						}

					}
					if (iNum) {
						record.TimeEntryDataFields.CATSHOURS = iNum;
						record.TimeEntryOperation = "C";
					}
					record.TimeEntryDataFields.POSID = sPosid;
					var aRow = aWorkListData.find(function (entry, id) {
						return entry.WorkListDataFields.POSID === sPosid;
					});
					record.TimeEntryDataFields.LSTNR = aRow.WorkListDataFields.LSTNR;
					record.TimeEntryDataFields.LTXA1 = aRow.WorkListDataFields.LTXA1;
					record.TimeEntryDataFields.RPROJ = aRow.WorkListDataFields.RPROJ;
					record.TimeEntryDataFields.TASKCOMPONENT = aRow.WorkListDataFields.TASKCOMPONENT;
					record.TimeEntryDataFields.TASKLEVEL = aRow.WorkListDataFields.Catstasklevel;
					record.TimeEntryDataFields.TASKTYPE = aRow.WorkListDataFields.TASKTYPE;
					record.TimeEntryDataFields.LSTAR = aRow.WorkListDataFields.LSTAR; //Activity type
				}

			}

			if (aExistingData.length) {
				for (var m = 0; m < aExistingData.length; m++) {
					var records = data.filter(function (element, index) {
						return element.TimeEntryDataFields.POSID === aExistingData[m].posid && element.TimeEntryDataFields.AWART === "WRK";
					});
					for (var n = 0; n < aExistingData[m].rowsdata.length; n++) {
						for (var o = 0; o < records.length; o++) {
							if (o === n) {
								records[o].TimeEntryDataFields.LONGTEXT = aExistingData[m].rowsdata[n].LONGTEXT;
								records[o].TimeEntryDataFields.LONGTEXT_DATA = aExistingData[m].rowsdata[n].LONGTEXT_DATA;
								break;
							}
						}
					}
				}
			}
			var toastMsg = this.getResourceBundle().getText("dataCopied");
			sap.m.MessageToast.show(toastMsg, {
				//	duration: 3000
			});
			this.getModel("controls").setProperty("/prevWeekBut", false);
		},
		prepareTableDataHrs: function (data, startDate, endDate) {
			var that = this;
			var oDate = new Date(that.mCalendar.getStartDate());
			startDate = that.getFirstDayOfWeek(oDate, that.firstDayOfWeek);
			endDate = that.getLastDayOfWeek(oDate, that.firstDayOfWeek);
			var entries = $.extend(true, [], this.getModel('TimeEntries').getData());
			var oModel = new sap.ui.model.json.JSONModel();
			var aTableRecords = {
				"totalHours": "",
				"rowsdata": []
			};
			var aTableArray = [];
			var sumTotalHours = 0;
			for (var i = startDate; i <= endDate; i.setDate(i.getDate() + 1)) {
				var dateSearch = i;
				var daterecords = $.grep(entries, function (element, index) {
					var date = new Date(element.CaleDate.substring(0, 4) + "-" + element.CaleDate.substring(4, 6) + "-" + element.CaleDate.substring(
						6, 8));
					date = new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
					return that.oFormatyyyymmdd.format(date) == that.oFormatyyyymmdd.format(dateSearch) && element.Status !== '99';
				});
				if (daterecords.length === 0) {
					continue;
				}
				var sumDayHours = 0;
				if (daterecords[0].TimeEntries.results.length !== 0) {
					for (var j = 0; j < daterecords[0].TimeEntries.results.length; j++) {
						sumDayHours = parseFloat(sumDayHours) + parseFloat(daterecords[0].TimeEntries.results[j].TimeEntryDataFields
							.CATSHOURS);
						sumTotalHours = parseFloat(sumTotalHours) + parseFloat(daterecords[0].TimeEntries.results[j].TimeEntryDataFields
							.CATSHOURS);
					}
					var date1 = new Date(daterecords[0].CaleDate.substring(0, 4) + "-" + daterecords[0].CaleDate.substring(4, 6) + "-" +
						daterecords[0].CaleDate.substring(6, 8));
					date1 = new Date(date1.getUTCFullYear(), date1.getUTCMonth(), date1.getUTCDate());
					aTableRecords.rowsdata.push({
						"sumHours": sumDayHours.toFixed(2),
						"WORKDATE": date1
					});

					if (aTableArray.length) {
						aTableArray[0].rowsdata.push(aTableRecords.rowsdata[0]);
					} else {
						aTableArray.push(aTableRecords);
					}
					aTableRecords = {
						"totalHours": "",
						"rowsdata": []
					};
				} else {
					var date1 = new Date(daterecords[0].CaleDate.substring(0, 4) + "-" + daterecords[0].CaleDate.substring(4, 6) + "-" +
						daterecords[0].CaleDate.substring(6, 8));
					date1 = new Date(date1.getUTCFullYear(), date1.getUTCMonth(), date1.getUTCDate());
					aTableRecords.rowsdata.push({
						"sumHours": "00:00",
						"WORKDATE": date1
					});
					if (aTableArray.length) {
						aTableArray[0].rowsdata.push(aTableRecords.rowsdata[0]);
					} else {
						aTableArray.push(aTableRecords);
					}
					aTableRecords = {
						"totalHours": "",
						"rowsdata": []
					};
				}
			}
			startDate = that.getFirstDayOfWeek(oDate, that.firstDayOfWeek);
			that.mCalendar.setStartDate(startDate);
			aTableArray.totalHours = sumTotalHours.toFixed(2);
			oModel.setData(aTableArray);
			this.setModel(oModel, "aTableRowsHours");

		},
		prepareTableDataAbsence: function (data, startDate, endDate, key) {
			var that = this;
			var oDate = new Date(that.mCalendar.getStartDate());
			startDate = that.getFirstDayOfWeek(oDate, that.firstDayOfWeek);
			endDate = that.getLastDayOfWeek(oDate, that.firstDayOfWeek);
			var entries = $.extend(true, [], this.getModel('TimeEntries').getData());
			var oModel = new sap.ui.model.json.JSONModel();
			var aAwarts = [];
			if (key) {
				aAwarts.push(key);
			} else {
				for (var i = 0; i < data.length; i++) {
					if (data[i].TimeEntries.results.length !== 0) {
						for (var j = 0; j < data[i].TimeEntries.results.length; j++) {
							if (data[i].TimeEntries.results[j].TimeEntryDataFields.AWART !== "WRK") {
								aAwarts.push(data[i].TimeEntries.results[j].TimeEntryDataFields.AWART);
							}
						}
					}
				}
				aAwarts = aAwarts.filter(function (item, index, inputArray) {
					return inputArray.indexOf(item) == index && inputArray.indexOf(item) !== "";
				});
				aAwarts = aAwarts.filter(function (row, index) {
					return row;
				});
			}
			var aTableRecords = {
				"admintype": "",
				"posidtitle": "",
				"rowsdata": []
			};
			var aTableArray = [];
			for (var j = 0; j < aAwarts.length; j++) {
				aTableRecords.admintype = aAwarts[j];
				//fill admintype text
				var oAdminTypeModel = this.getModel("AdminTypeData");
				var aAdminData = oAdminTypeModel.getData();
				var aRow = aAdminData.find(function (entry, id) {
					return entry.Awart === aAwarts[j];
				});
				if (aRow) {
					aTableRecords.posidtitle = aRow.Atext;
				}
				for (var i = startDate; i <= endDate; i.setDate(i.getDate() + 1)) {
					var dateSearch = i;
					var daterecords = $.grep(entries, function (element, index) {
						var date = new Date(element.CaleDate.substring(0, 4) + "-" + element.CaleDate.substring(4, 6) + "-" + element.CaleDate.substring(
							6, 8));
						date = new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
						return that.oFormatyyyymmdd.format(date) == that.oFormatyyyymmdd.format(dateSearch) && element.Status !== '99';
					});
					if (daterecords.length === 0) {
						continue;
					}
					if (daterecords[0].TimeEntries.results.length !== 0) {
						for (var k = 0; k < daterecords[0].TimeEntries.results.length; k++) {
							var aRow = daterecords[0].TimeEntries.results.find(function (entry, id) {
								return entry.TimeEntryDataFields.AWART === aAwarts[j];
							});
							if (aRow) {
								var iNum;
								var sValue1 = parseInt(aRow.TimeEntryDataFields.CATSHOURS.split(".")[0]);
								var sValue2 = aRow.TimeEntryDataFields.CATSHOURS.split(".")[1];
								if (sValue1) {
									if (sValue1 <= 9) {
										iNum = "0" + sValue1 + ":" + sValue2;
									}
								}
								var sTime = parseFloat(aRow.TimeEntryDataFields.CATSHOURS.trim());
								var sHours = Math.floor(sTime);
								var sHours1 = Math.floor(sTime).toString();
								var sMinutes = Math.round((sTime - sHours) * 60).toString();
								if (sHours1.length === 1) {
									sHours1 = "0" + sHours1;
								}
								if (sMinutes.length === 1) {
									sMinutes = "0" + sMinutes;
								}
								aRow.TimeEntryDataFields.CATSHOURS = sHours1 + ":" + sMinutes;
								aTableRecords.rowsdata.push(aRow.TimeEntryDataFields);
								aTableRecords.rowsdata[0].Counter = aRow.Counter;
								aTableRecords.rowsdata[0].DayStatus = daterecords[0].Status;
								aTableRecords.rowsdata[0].RejReason = aRow.RejReason;
								aTableRecords.rowsdata[0].RejReasondesc = aRow.RejReasondesc;
								// Added as part of enabling and disabling based on AllowEdit
								aTableRecords.rowsdata[0].AllowEdit = aRow.AllowEdit;
							} else {
								var date1 = new Date(daterecords[0].CaleDate.substring(0, 4) + "-" + daterecords[0].CaleDate.substring(4, 6) + "-" +
									daterecords[0].CaleDate.substring(6, 8));
								date1 = new Date(date1.getUTCFullYear(), date1.getUTCMonth(), date1.getUTCDate());
								aTableRecords.rowsdata.push({
									"Counter": "",
									"CATSHOURS": "0:00",
									"STATUS": "",
									"WORKDATE": date1,
									"DayStatus": "",
									"LONGTEXT_DATA": "",
									"LONGTEXT": "",
									"RejReason": "",
									"RejReasondesc": ""
								});
							}
							if (aTableArray.length && aTableArray[j]) {
								if (aTableArray[j].rowsdata) {
									aTableArray[j].rowsdata.push(aTableRecords.rowsdata[0]);
								}
							} else {
								aTableArray.push(aTableRecords);
							}
							aTableRecords = {
								"admintype": "",
								"posidtitle": "",
								"rowsdata": []
							};
							break;
						}

					} else {
						var date1 = new Date(daterecords[0].CaleDate.substring(0, 4) + "-" + daterecords[0].CaleDate.substring(4, 6) + "-" +
							daterecords[0].CaleDate.substring(6, 8));
						date1 = new Date(date1.getUTCFullYear(), date1.getUTCMonth(), date1.getUTCDate());
						aTableRecords.rowsdata.push({
							"Counter": "",
							"CATSHOURS": "0:00",
							"STATUS": "",
							"WORKDATE": date1,
							"DayStatus": "",
							"LONGTEXT_DATA": "",
							"LONGTEXT": "",
							"RejReason": "",
							"RejReasondesc": ""
						});
						if (aTableArray.length && aTableArray[j]) {
							if (aTableArray[j].rowsdata) {
								aTableArray[j].rowsdata.push(aTableRecords.rowsdata[0]);
							}
						} else {
							aTableArray.push(aTableRecords);
						}
						aTableRecords = {
							"admintype": "",
							"posidtitle": "",
							"rowsdata": []
						};
					}

				}
				startDate = that.getFirstDayOfWeek(oDate, that.firstDayOfWeek);
				startDate.setHours(0);
				startDate.setMinutes(0);
				startDate.setSeconds(0);
				startDate.setMilliseconds(0);
				aTableRecords = {
					"admintype": "",
					"posidtitle": "",
					"rowsdata": []
				};
				that.mCalendar.setStartDate(startDate);
			}
			oModel.setData(aTableArray);
			for (var m = 0; m < aTableArray.length; m++) {
				var totalEnteredHoursWeek = 0;
				for (var j = 0; j < aTableArray[m].rowsdata.length; j++) {
					totalEnteredHoursWeek = totalEnteredHoursWeek + parseFloat(aTableArray[m].rowsdata[j].CATSHOURS);
				}
				aTableArray[m]["totalweekcatsEntered"] = parseFloat(totalEnteredHoursWeek).toFixed(2);
				var bApprovedEntryFound = false;
				for (var k = 0; k < aTableArray[m].rowsdata.length; k++) {

					if (aTableArray[m].rowsdata[k].DayStatus === "DONE") {
						bApprovedEntryFound = true;
						break;
					}
				}
				if (bApprovedEntryFound) {
					aTableArray[m]["overallWeekStatus"] = true;
				} else {
					aTableArray[m]["overallWeekStatus"] = false;
				}
			}
			this.getModel("aTableRowsAbs").setData(aTableArray);
		},
		prepareTableData: function (data, startDate, endDate, sKey) {
			var that = this;
			var oDate = new Date(that.mCalendar.getStartDate());
			startDate = that.getFirstDayOfWeek(oDate, that.firstDayOfWeek);
			endDate = that.getLastDayOfWeek(oDate, that.firstDayOfWeek);
			var entries = $.extend(true, [], this.getModel('TimeEntries').getData());
			var oModel = new sap.ui.model.json.JSONModel();
			var aPosIds = [];
			var aTableRecords = {
				"posid": "",
				"rowsdata": []
			};
			var aTableArray = [];
			if (sKey) {
				aPosIds.push(sKey);
			} else {
				for (var i = 0; i < data.length; i++) {
					if (data[i].TimeEntries.results.length !== 0) {
						for (var j = 0; j < data[i].TimeEntries.results.length; j++) {
							aPosIds.push(data[i].TimeEntries.results[j].TimeEntryDataFields.POSID);
						}
					}
				}
				aPosIds = aPosIds.filter(function (item, index, inputArray) {
					return inputArray.indexOf(item) == index && inputArray.indexOf(item) !== "";
				});
				aPosIds = aPosIds.filter(function (row, index) {
					return row;
				});
			}
			if (aPosIds.length) {
				for (var k = 0; k < aPosIds.length; k++) {
					aTableRecords.posid = aPosIds[k];
					for (var i = startDate; i <= endDate; i.setDate(i.getDate() + 1)) {
						var dateSearch = i;
						var daterecords = $.grep(entries, function (element, index) {
							var date = new Date(element.CaleDate.substring(0, 4) + "-" + element.CaleDate.substring(4, 6) + "-" + element.CaleDate
								.substring(
									6, 8));
							date = new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
							return that.oFormatyyyymmdd.format(date) == that.oFormatyyyymmdd.format(dateSearch) && element.Status !== '99';
						});
						if (daterecords.length === 0) {
							continue;
						}
						if (daterecords[0].TimeEntries.results.length !== 0) {
							for (var j = 0; j < daterecords[0].TimeEntries.results.length; j++) {
								var aRow = daterecords[0].TimeEntries.results.find(function (entry, id) {
									return entry.TimeEntryDataFields.POSID === aPosIds[k];
								});
								if (aRow) {
									var iNum;
									var sValue1 = parseInt(aRow.TimeEntryDataFields.CATSHOURS.split(".")[0]);
									var sValue2 = aRow.TimeEntryDataFields.CATSHOURS.split(".")[1];
									if (sValue1) {
										if (sValue1 <= 9) {
											iNum = "0" + sValue1 + ":" + sValue2;
										}
									}
									var sTime = parseFloat(aRow.TimeEntryDataFields.CATSHOURS.trim());
									var sHours = Math.floor(sTime);
									var sHours1 = Math.floor(sTime).toString();
									var sMinutes = Math.round((sTime - sHours) * 60).toString();
									if (sHours1.length === 1) {
										sHours1 = "0" + sHours1;
									}
									if (sMinutes.length === 1) {
										sMinutes = "0" + sMinutes;
									}
									aRow.TimeEntryDataFields.CATSHOURS = sHours1 + ":" + sMinutes;
									aTableRecords.rowsdata.push(aRow.TimeEntryDataFields);
									aTableRecords.rowsdata[0].Counter = aRow.Counter;
									aTableRecords.rowsdata[0].DayStatus = daterecords[0].Status;
									aTableRecords.rowsdata[0].RejReason = aRow.RejReason;
									aTableRecords.rowsdata[0].RejReasondesc = aRow.RejReasondesc;
									// Added as part of enabling and disabling based on AllowEdit
									aTableRecords.rowsdata[0].AllowEdit = aRow.AllowEdit;
								} else {
									var date1 = new Date(daterecords[0].CaleDate.substring(0, 4) + "-" + daterecords[0].CaleDate.substring(4, 6) + "-" +
										daterecords[0].CaleDate.substring(6, 8));
									date1 = new Date(date1.getUTCFullYear(), date1.getUTCMonth(), date1.getUTCDate());
									aTableRecords.rowsdata.push({
										//	 oObj={
										"Counter": "",
										"CATSHOURS": "0:00",
										"DayStatus": "",
										"WORKDATE": date1,
										"LONGTEXT_DATA": "",
										"LONGTEXT": "",
										"RejReason": "",
										"RejReasondesc": "",
										"STATUS": ""
									});
								}
								if (aTableArray.length && aTableArray[k]) {
									if (aTableArray[k].rowsdata) {
										aTableArray[k].rowsdata.push(aTableRecords.rowsdata[0]);
									}
								} else {
									aTableArray.push(aTableRecords);
								}
								aTableRecords = {
									"posid": "",
									"rowsdata": []
								};
								break;
							}
						} else {
							var date1 = new Date(daterecords[0].CaleDate.substring(0, 4) + "-" + daterecords[0].CaleDate.substring(4, 6) + "-" +
								daterecords[0].CaleDate.substring(6, 8));
							date1 = new Date(date1.getUTCFullYear(), date1.getUTCMonth(), date1.getUTCDate());
							aTableRecords.rowsdata.push({
								//	 oObj={
								"Counter": "",
								"CATSHOURS": "0:00",
								"DayStatus": "",
								"WORKDATE": date1,
								"LONGTEXT_DATA": "",
								"LONGTEXT": "",
								"RejReason": "",
								"RejReasondesc": "",
								"STATUS": ""
							});
							if (aTableArray.length && aTableArray[k]) {
								if (aTableArray[k].rowsdata) {
									aTableArray[k].rowsdata.push(aTableRecords.rowsdata[0]);
								}
							} else {
								aTableArray.push(aTableRecords);
							}
							aTableRecords = {
								"posid": "",
								"rowsdata": []
							};

						}

					}
					startDate = that.getFirstDayOfWeek(oDate, that.firstDayOfWeek);
					startDate.setHours(0);
					startDate.setMinutes(0);
					startDate.setSeconds(0);
					startDate.setMilliseconds(0);
				}
				startDate = that.getFirstDayOfWeek(oDate, that.firstDayOfWeek);
				startDate.setHours(0);
				startDate.setMinutes(0);
				startDate.setSeconds(0);
				startDate.setMilliseconds(0);
				that.mCalendar.setStartDate(startDate);
			}
			//fill the total hours and posid title
			if (aTableArray.length) {
				this.totalHoursAndPosId(aTableArray);
			}
			this.getModel("aTableRows").setData(aTableArray);
			this.getModel("aTableRows").refresh(true);
			var totalHurs = 0;
			for (var l = 0; l < aTableArray.length; l++) {
				totalHurs = totalHurs + parseFloat(aTableArray[l].totalweekcatsEntered);

			}
			var object = [{
				"key": this.getResourceBundle().getText("totalPayHrs"),
				"text": parseFloat(totalHurs).toFixed(2)
			}];
			var oModel1 = new sap.ui.model.json.JSONModel(object);
			this.getView().setModel(oModel1, "aTableRowsHours");
			this.getView().getModel("aTableRowsHours").refresh();
			if (this.getModel("aTableRows").getData().length !== 0) {
				//	this.byId("idPreviousWeek").setVisible(false);
				this.getModel("controls").setProperty("/prevWeekBut", false);

			} else {
				that.getModel("controls").setProperty("/prevWeekBut", true);
			}
		},
		bindTable1Copy: function (startDate, endDate) {
			var that = this;
			var oDate = new Date(that.mCalendar.getStartDate());
			var entries = $.extend(true, [], this.getModel('TimeEntries').getData());
			var oModel = new sap.ui.model.json.JSONModel();
			var timedata = [];
			var aggr = this.entryListContents.getItems();
			var statusdata = [{
				key: '100',
				text: '{i18n>allStatus}'
			}, {
				key: '10'
			}, {
				key: '20'
			}, {
				key: '30'
			}, {
				key: '40'
			}];
			var aPosIds = this.getModel("aTableRowsCopy").getData();
			if (aPosIds.length) {
				for (var p = 0; p < aPosIds.length; p++) {
					for (var i = endDate; i >= startDate; i.setDate(i.getDate() - 1)) {
						var dateSearch = i;
						var daterecords = $.grep(entries, function (element, index) {
							var date = new Date(element.CaleDate.substring(0, 4) + "-" + element.CaleDate.substring(4, 6) + "-" + element.CaleDate
								.substring(
									6, 8));
							date = new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
							return that.oFormatyyyymmdd.format(date) == that.oFormatyyyymmdd.format(dateSearch) && element.Status !== '99';
						});
						if (daterecords.length === 0) {
							continue;
						}
						var date1 = new Date(daterecords[0].CaleDate.substring(0, 4) + "-" + daterecords[0].CaleDate.substring(4, 6) + "-" +
							daterecords[
								0].CaleDate.substring(
								6, 8));
						date1 = new Date(date1.getUTCFullYear(), date1.getUTCMonth(), date1.getUTCDate());
						startDate.setHours(0);
						startDate.setMinutes(0);
						startDate.setSeconds(0);
						startDate.setMilliseconds(0);
						var recordTemplate = {
							AllowEdit: "",
							AllowRelease: "",
							AssignmentId: "",
							AssignmentName: "",
							CatsDocNo: "",
							Counter: "",
							Pernr: this.empID,
							RefCounter: "",
							RejReason: "",
							Status: "",
							SetDraft: false,
							HeaderData: {
								target: daterecords[0].TargetHours,
								sum: "0.00",
								//	date: new Date(i),
								date: date1,
								addButton: false,
								highlight: false
							},
							target: daterecords[0].TargetHours,
							TimeEntryDataFields: {
								AENAM: "",
								ALLDF: "",
								APDAT: null,
								APNAM: "",
								ARBID: "00000000",
								ARBPL: "",
								AUERU: "",
								AUFKZ: "",
								AUTYP: "00",
								AWART: "WRK",
								BEGUZ: "000000",
								BELNR: "",
								BEMOT: "",
								BUDGET_PD: "",
								BUKRS: "",
								BWGRL: "0.0",
								CATSAMOUNT: "0.0",
								CATSHOURS: "0.00",
								CATSQUANTITY: "0.0",
								CPR_EXTID: "",
								CPR_GUID: "",
								CPR_OBJGEXTID: "",
								CPR_OBJGUID: "",
								CPR_OBJTYPE: "",
								ENDUZ: "000000",
								ERNAM: "",
								ERSDA: "",
								ERSTM: "",
								ERUZU: "",
								EXTAPPLICATION: "",
								EXTDOCUMENTNO: "",
								EXTSYSTEM: "",
								FUNC_AREA: "",
								FUND: "",
								GRANT_NBR: "",
								HRBUDGET_PD: "",
								HRCOSTASG: "0",
								HRFUNC_AREA: "",
								HRFUND: "",
								HRGRANT_NBR: "",
								HRKOSTL: "",
								HRLSTAR: "",
								KAPAR: "",
								KAPID: "00000000",
								KOKRS: "",
								LAEDA: "",
								LAETM: "",
								LGART: "",
								LOGSYS: "",
								LONGTEXT: "",
								LONGTEXT_DATA: "",
								LSTAR: "",
								LSTNR: "",
								LTXA1: "",
								MEINH: "",
								OFMNW: "0.0",
								OTYPE: "",
								PAOBJNR: "0000000000",
								PEDD: null,
								PERNR: "00000000",
								PLANS: "00000000",
								POSID: aPosIds[p].posid,
								PRAKN: "",
								PRAKZ: "0000",
								PRICE: "0.0",
								RAPLZL: "00000000",
								RAUFNR: "",
								RAUFPL: "0000000000",
								REASON: "",
								REFCOUNTER: "000000000000",
								REINR: "0000000000",
								RKDAUF: "",
								RKDPOS: "000000",
								RKOSTL: "",
								RKSTR: "",
								RNPLNR: "",
								RPROJ: "00000000",
								RPRZNR: "",
								SBUDGET_PD: "",
								SEBELN: "",
								SEBELP: "00000",
								SKOSTL: "",
								SPLIT: "0",
								SPRZNR: "",
								STATKEYFIG: "",
								STATUS: "",
								S_FUNC_AREA: "",
								S_FUND: "",
								S_GRANT_NBR: "",
								TASKCOMPONENT: "",
								TASKCOUNTER: "",
								TASKLEVEL: "",
								TASKTYPE: "",
								TCURR: "",
								TRFGR: "",
								TRFST: "",
								UNIT: "",
								UVORN: "",
								VERSL: "",
								VORNR: "",
								VTKEN: "",
								WABLNR: "",
								WAERS: "",
								WERKS: "",
								WORKDATE: date1,
								WORKITEMID: "000000000000",
								WTART: ""
							},
							TimeEntryOperation: ""
						};
						this.getModel("TimeData").getData().unshift(recordTemplate);
					}
					endDate = that.getLastDayOfWeek(oDate, 1);
					endDate.setHours(0);
					endDate.setMinutes(0);
					endDate.setSeconds(0);
					endDate.setMilliseconds(0);
				}
			}
		},
		bindTable2Copy: function (startDate, endDate) {
			var that = this;
			var aPosIds = [];
			var oDate = new Date(that.mCalendar.getStartDate());
			var startDate = this.getPreviousWeekDate(oDate);
			var endDate = this.getLastDayOfWeek(startDate, 1);
			var entries = $.extend(true, [], this.getModel('TimeEntriesCopy').getData());
			var oModel = new sap.ui.model.json.JSONModel();
			var timedata = [];
			var statusdata = [{
				key: '100',
				text: '{i18n>allStatus}'
			}, {
				key: '10'
			}, {
				key: '20'
			}, {
				key: '30'
			}, {
				key: '40'
			}];
			for (var i = 0; i < entries.length; i++) {
				if (entries[i].TimeEntries.results.length !== 0) {
					for (var j = 0; j < entries[i].TimeEntries.results.length; j++) {
						aPosIds.push(entries[i].TimeEntries.results[j].TimeEntryDataFields.POSID);
					}
				}
			}
			aPosIds = aPosIds.filter(function (item, index, inputArray) {
				return inputArray.indexOf(item) == index;
			});
			aPosIds = aPosIds.filter(function (row, index) {
				return row;
			});
			if (aPosIds.length) {
				for (var p = 0; p < aPosIds.length; p++) {
					for (var i = startDate; i <= endDate; i.setDate(i.getDate() + 1)) {
						var dateSearch = i;
						var daterecords = $.grep(entries, function (element, index) {
							var date = new Date(element.CaleDate.substring(0, 4) + "-" + element.CaleDate.substring(4, 6) + "-" + element.CaleDate
								.substring(
									6, 8));
							date = new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
							return that.oFormatyyyymmdd.format(date) == that.oFormatyyyymmdd.format(dateSearch) && element.Status !== '99';
						});
						if (daterecords.length === 0) {
							continue;
						}
						var date1 = new Date(daterecords[0].CaleDate.substring(0, 4) + "-" + daterecords[0].CaleDate.substring(4, 6) + "-" +
							daterecords[
								0].CaleDate.substring(
								6, 8));
						date1 = new Date(date1.getUTCFullYear(), date1.getUTCMonth(), date1.getUTCDate());
						startDate.setHours(0);
						startDate.setMinutes(0);
						startDate.setSeconds(0);
						startDate.setMilliseconds(0);
						var recordTemplate = {
							AllowEdit: "",
							AllowRelease: "",
							AssignmentId: "",
							AssignmentName: "",
							CatsDocNo: "",
							Counter: "",
							Pernr: this.empID,
							RefCounter: "",
							RejReason: "",
							Status: "",
							SetDraft: false,
							HeaderData: {
								target: daterecords[0].TargetHours,
								sum: "0.00",
								date: date1,
								addButton: false,
								highlight: false
							},
							target: daterecords[0].TargetHours,
							TimeEntryDataFields: {
								AENAM: "",
								ALLDF: "",
								APDAT: null,
								APNAM: "",
								ARBID: "00000000",
								ARBPL: "",
								AUERU: "",
								AUFKZ: "",
								AUTYP: "00",
								AWART: "WRK",
								BEGUZ: "000000",
								BELNR: "",
								BEMOT: "",
								BUDGET_PD: "",
								BUKRS: "",
								BWGRL: "0.0",
								CATSAMOUNT: "0.0",
								CATSHOURS: "0.00",
								CATSQUANTITY: "0.0",
								CPR_EXTID: "",
								CPR_GUID: "",
								CPR_OBJGEXTID: "",
								CPR_OBJGUID: "",
								CPR_OBJTYPE: "",
								ENDUZ: "000000",
								ERNAM: "",
								ERSDA: "",
								ERSTM: "",
								ERUZU: "",
								EXTAPPLICATION: "",
								EXTDOCUMENTNO: "",
								EXTSYSTEM: "",
								FUNC_AREA: "",
								FUND: "",
								GRANT_NBR: "",
								HRBUDGET_PD: "",
								HRCOSTASG: "0",
								HRFUNC_AREA: "",
								HRFUND: "",
								HRGRANT_NBR: "",
								HRKOSTL: "",
								HRLSTAR: "",
								KAPAR: "",
								KAPID: "00000000",
								KOKRS: "",
								LAEDA: "",
								LAETM: "",
								LGART: "",
								LOGSYS: "",
								LONGTEXT: "",
								LONGTEXT_DATA: "",
								LSTAR: "",
								LSTNR: "",
								LTXA1: "",
								MEINH: "",
								OFMNW: "0.0",
								OTYPE: "",
								PAOBJNR: "0000000000",
								PEDD: null,
								PERNR: "00000000",
								PLANS: "00000000",
								POSID: aPosIds[p],
								PRAKN: "",
								PRAKZ: "0000",
								PRICE: "0.0",
								RAPLZL: "00000000",
								RAUFNR: "",
								RAUFPL: "0000000000",
								REASON: "",
								REFCOUNTER: "000000000000",
								REINR: "0000000000",
								RKDAUF: "",
								RKDPOS: "000000",
								RKOSTL: "",
								RKSTR: "",
								RNPLNR: "",
								RPROJ: "00000000",
								RPRZNR: "",
								SBUDGET_PD: "",
								SEBELN: "",
								SEBELP: "00000",
								SKOSTL: "",
								SPLIT: "0",
								SPRZNR: "",
								STATKEYFIG: "",
								STATUS: "",
								S_FUNC_AREA: "",
								S_FUND: "",
								S_GRANT_NBR: "",
								TASKCOMPONENT: "",
								TASKCOUNTER: "",
								TASKLEVEL: "",
								TASKTYPE: "",
								TCURR: "",
								TRFGR: "",
								TRFST: "",
								UNIT: "",
								UVORN: "",
								VERSL: "",
								VORNR: "",
								VTKEN: "",
								WABLNR: "",
								WAERS: "",
								WERKS: "",
								//	WORKDATE: new Date(i),
								WORKDATE: date1,
								WORKITEMID: "000000000000",
								WTART: ""
							},
							TimeEntryOperation: ""
						};
						var sumHours = 0;
						for (var j = 0; j < daterecords[0].TimeEntries.results.length; j++) {
							daterecords[0].TimeEntries.results[j].totalHours = sumHours.toFixed(2);
							if ((j + 1) === daterecords[0].TimeEntries.results.length) {
								daterecords[0].TimeEntries.results[j].addButton = true;
								daterecords[0].TimeEntries.results[j].addButtonEnable = true;
								daterecords[0].TimeEntries.results[j].deleteButton = true;
								daterecords[0].TimeEntries.results[j].deleteButtonEnable = true;
								daterecords[0].TimeEntries.results[j].SetDraft = false;
								daterecords[0].TimeEntries.results[j].HeaderData = {
									target: daterecords[0].TargetHours,
									sum: sumHours,
									date: new Date(i),
									addButton: true,
									highlight: false
								};
							} else {
								daterecords[0].TimeEntries.results[j].addButton = false;
								daterecords[0].TimeEntries.results[j].deleteButton = true;
								daterecords[0].TimeEntries.results[j].deleteButtonEnable = true;
								daterecords[0].TimeEntries.results[j].SetDraft = false;
								daterecords[0].TimeEntries.results[j].HeaderData = {
									target: daterecords[0].TargetHours,
									sum: sumHours,
									date: new Date(i),
									addButton: false,
									highlight: false
								};
							}
						}
						if (daterecords[0].TimeEntries.results.length !== 0) {
							for (var j = 0; j < daterecords[0].TimeEntries.results.length; j++) {
								var aRow = daterecords[0].TimeEntries.results.find(function (entry, id) {
									return entry.TimeEntryDataFields.POSID === aPosIds[p];
								});
								if (aRow) {
									aRow.target = daterecords[0].TargetHours;
									aRow.TimeEntryDataFields.CATSHOURS = parseFloat(daterecords[0].TimeEntries.results[j].TimeEntryDataFields
										.CATSHOURS).toFixed(2);
									if (aRow.TimeEntryDataFields.STATUS !== '10' && aRow.TimeEntryDataFields
										.STATUS !== '40') {
										sumHours = parseFloat(sumHours) + parseFloat(aRow.TimeEntryDataFields
											.CATSHOURS);
									}
									timedata.push(aRow);
								} else {
									timedata.push(recordTemplate);
								}
								break;
							}
						} else {
							timedata.push(recordTemplate);
						}
					}
					startDate = this.getPreviousWeekDate(oDate);
					startDate.setHours(0);
					startDate.setMinutes(0);
					startDate.setSeconds(0);
					startDate.setMilliseconds(0);
				}
				startDate = this.getPreviousWeekDate(oDate);
				startDate.setHours(0);
				startDate.setMinutes(0);
				startDate.setSeconds(0);
				startDate.setMilliseconds(0);
			} else {}
			// add admint types data
			var aAwarts = [];
			for (var i = 0; i < entries.length; i++) {
				if (entries[i].TimeEntries.results.length !== 0) {
					for (var j = 0; j < entries[i].TimeEntries.results.length; j++) {
						if (entries[i].TimeEntries.results[j].TimeEntryDataFields.AWART !== "WRK") {
							aAwarts.push(entries[i].TimeEntries.results[j].TimeEntryDataFields.AWART);
						}
					}
				}
			}
			aAwarts = aAwarts.filter(function (item, index, inputArray) {
				return inputArray.indexOf(item) == index && inputArray.indexOf(item) !== "";
			});
			aAwarts = aAwarts.filter(function (row, index) {
				return row;
			});
			for (var j = 0; j < aAwarts.length; j++) {
				for (var i = startDate; i <= endDate; i.setDate(i.getDate() + 1)) {
					var dateSearch = i;
					var daterecords = $.grep(entries, function (element, index) {
						var date = new Date(element.CaleDate.substring(0, 4) + "-" + element.CaleDate.substring(4, 6) + "-" + element.CaleDate.substring(
							6, 8));
						date = new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
						return that.oFormatyyyymmdd.format(date) == that.oFormatyyyymmdd.format(dateSearch) && element.Status !== '99';
					});
					if (daterecords.length === 0) {
						continue;
					}
					var date1 = new Date(daterecords[0].CaleDate.substring(0, 4) + "-" + daterecords[0].CaleDate.substring(4, 6) + "-" +
						daterecords[
							0].CaleDate.substring(
							6, 8));
					date1 = new Date(date1.getUTCFullYear(), date1.getUTCMonth(), date1.getUTCDate());
					startDate.setHours(0);
					startDate.setMinutes(0);
					startDate.setSeconds(0);
					startDate.setMilliseconds(0);
					var recordTemplate = {
						AllowEdit: "",
						AllowRelease: "",
						AssignmentId: "",
						AssignmentName: "",
						CatsDocNo: "",
						Counter: "",
						Pernr: this.empID,
						RefCounter: "",
						RejReason: "",
						Status: "",
						SetDraft: false,
						HeaderData: {
							target: "0.00",
							sum: "0.00",
							date: date1,
							addButton: false,
							highlight: false
						},
						target: "0.00",
						TimeEntryDataFields: {
							AENAM: "",
							ALLDF: "",
							APDAT: null,
							APNAM: "",
							ARBID: "00000000",
							ARBPL: "",
							AUERU: "",
							AUFKZ: "",
							AUTYP: "00",
							AWART: aAwarts[j],
							BEGUZ: "000000",
							BELNR: "",
							BEMOT: "",
							BUDGET_PD: "",
							BUKRS: "",
							BWGRL: "0.0",
							CATSAMOUNT: "0.0",
							CATSHOURS: "0.00",
							CATSQUANTITY: "0.0",
							CPR_EXTID: "",
							CPR_GUID: "",
							CPR_OBJGEXTID: "",
							CPR_OBJGUID: "",
							CPR_OBJTYPE: "",
							ENDUZ: "000000",
							ERNAM: "",
							ERSDA: "",
							ERSTM: "",
							ERUZU: "",
							EXTAPPLICATION: "",
							EXTDOCUMENTNO: "",
							EXTSYSTEM: "",
							FUNC_AREA: "",
							FUND: "",
							GRANT_NBR: "",
							HRBUDGET_PD: "",
							HRCOSTASG: "0",
							HRFUNC_AREA: "",
							HRFUND: "",
							HRGRANT_NBR: "",
							HRKOSTL: "",
							HRLSTAR: "",
							KAPAR: "",
							KAPID: "00000000",
							KOKRS: "",
							LAEDA: "",
							LAETM: "",
							LGART: "",
							LOGSYS: "",
							LONGTEXT: "",
							LONGTEXT_DATA: "",
							LSTAR: "",
							LSTNR: "",
							LTXA1: "",
							MEINH: "",
							OFMNW: "0.0",
							OTYPE: "",
							PAOBJNR: "0000000000",
							PEDD: null,
							PERNR: "00000000",
							PLANS: "00000000",
							POSID: "",
							PRAKN: "",
							PRAKZ: "0000",
							PRICE: "0.0",
							RAPLZL: "00000000",
							RAUFNR: "",
							RAUFPL: "0000000000",
							REASON: "",
							REFCOUNTER: "000000000000",
							REINR: "0000000000",
							RKDAUF: "",
							RKDPOS: "000000",
							RKOSTL: "",
							RKSTR: "",
							RNPLNR: "",
							RPROJ: "00000000",
							RPRZNR: "",
							SBUDGET_PD: "",
							SEBELN: "",
							SEBELP: "00000",
							SKOSTL: "",
							SPLIT: "0",
							SPRZNR: "",
							STATKEYFIG: "",
							STATUS: "",
							S_FUNC_AREA: "",
							S_FUND: "",
							S_GRANT_NBR: "",
							TASKCOMPONENT: "",
							TASKCOUNTER: "",
							TASKLEVEL: "",
							TASKTYPE: "",
							TCURR: "",
							TRFGR: "",
							TRFST: "",
							UNIT: "",
							UVORN: "",
							VERSL: "",
							VORNR: "",
							VTKEN: "",
							WABLNR: "",
							WAERS: "",
							WERKS: "",
							WORKDATE: date1,
							WORKITEMID: "000000000000",
							WTART: ""
						},
						TimeEntryOperation: ""
					};
					if (daterecords[0].TimeEntries.results.length !== 0) {
						for (var k = 0; k < daterecords[0].TimeEntries.results.length; k++) {
							var aRow = daterecords[0].TimeEntries.results.find(function (entry, id) {
								return entry.TimeEntryDataFields.AWART === aAwarts[j];
							});
							if (aRow) {
								aRow.target = daterecords[0].TargetHours;
								aRow.TimeEntryDataFields.CATSHOURS = parseFloat(daterecords[0].TimeEntries.results[k].TimeEntryDataFields
									.CATSHOURS).toFixed(2);
								if (aRow.TimeEntryDataFields.STATUS !== '10' && aRow.TimeEntryDataFields
									.STATUS !== '40') {
									sumHours = parseFloat(sumHours) + parseFloat(aRow.TimeEntryDataFields
										.CATSHOURS);
								}
								timedata.push(aRow);
							} else {
								timedata.push(recordTemplate);
							}
							break;
						}
					} else {
						timedata.push(recordTemplate);
					}
				}
				startDate = this.getPreviousWeekDate(oDate);
				startDate.setHours(0);
				startDate.setMinutes(0);
				startDate.setSeconds(0);
				startDate.setMilliseconds(0);
			}
			startDate = this.getPreviousWeekDate(oDate);
			startDate.setHours(0);
			startDate.setMinutes(0);
			startDate.setSeconds(0);
			startDate.setMilliseconds(0);
			for (var i = 0; i < timedata.length; i++) {
				if (timedata[i].TimeEntryDataFields.STATUS === "10") {
					timedata[i].SetDraft = true;
				}
				var element = $.grep(statusdata, function (element, index) {
					if (timedata[i].TimeEntryDataFields.STATUS && timedata[i].TimeEntryDataFields.STATUS != "")
						return element.key === timedata[i].TimeEntryDataFields.STATUS;
				});
				if (element && element.length > 0) {
					continue;
				}
				timedata[i].highlight = "None";
				timedata[i].valueState = "None";
			}
			oModel.setData(timedata);
			this.setModel(oModel, "TimeDataCopy");
			this.setModel(new JSONModel(statusdata), "Status");
		},
		bindTable1: function (startDate, endDate) {
			var that = this;
			var aPosIds = [];
			var oDate = new Date(that.mCalendar.getStartDate());
			var entries = $.extend(true, [], this.getModel('TimeEntries').getData());
			var oModel = new sap.ui.model.json.JSONModel();
			var timedata = [];
			var statusdata = [{
				key: '100',
				text: '{i18n>allStatus}'
			}, {
				key: '10'
			}, {
				key: '20'
			}, {
				key: '30'
			}, {
				key: '40'
			}];
			for (var i = 0; i < entries.length; i++) {
				if (entries[i].TimeEntries.results.length !== 0) {
					for (var j = 0; j < entries[i].TimeEntries.results.length; j++) {
						aPosIds.push(entries[i].TimeEntries.results[j].TimeEntryDataFields.POSID);
					}
				}
			}
			aPosIds = aPosIds.filter(function (item, index, inputArray) {
				return inputArray.indexOf(item) == index;
			});
			aPosIds = aPosIds.filter(function (row, index) {
				return row;
			});
			if (aPosIds.length) {
				for (var p = 0; p < aPosIds.length; p++) {
					for (var i = startDate; i <= endDate; i.setDate(i.getDate() + 1)) {
						var dateSearch = i;
						var daterecords = $.grep(entries, function (element, index) {
							var date = new Date(element.CaleDate.substring(0, 4) + "-" + element.CaleDate.substring(4, 6) + "-" + element.CaleDate
								.substring(
									6, 8));
							date = new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
							return that.oFormatyyyymmdd.format(date) == that.oFormatyyyymmdd.format(dateSearch) && element.Status !== '99';
						});
						if (daterecords.length === 0) {
							continue;
						}
						var date1 = new Date(daterecords[0].CaleDate.substring(0, 4) + "-" + daterecords[0].CaleDate.substring(4, 6) + "-" +
							daterecords[
								0].CaleDate.substring(
								6, 8));
						date1 = new Date(date1.getUTCFullYear(), date1.getUTCMonth(), date1.getUTCDate());
						startDate.setHours(0);
						startDate.setMinutes(0);
						startDate.setSeconds(0);
						startDate.setMilliseconds(0);
						var recordTemplate = {
							AllowEdit: "",
							AllowRelease: "",
							AssignmentId: "",
							AssignmentName: "",
							CatsDocNo: "",
							Counter: "",
							Pernr: this.empID,
							RefCounter: "",
							RejReason: "",
							Status: "",
							SetDraft: false,
							HeaderData: {
								target: daterecords[0].TargetHours,
								sum: "0.00",
								date: date1,
								addButton: false,
								highlight: false
							},
							target: daterecords[0].TargetHours,
							TimeEntryDataFields: {
								AENAM: "",
								ALLDF: "",
								APDAT: null,
								APNAM: "",
								ARBID: "00000000",
								ARBPL: "",
								AUERU: "",
								AUFKZ: "",
								AUTYP: "00",
								AWART: "",
								BEGUZ: "000000",
								BELNR: "",
								BEMOT: "",
								BUDGET_PD: "",
								BUKRS: "",
								BWGRL: "0.0",
								CATSAMOUNT: "0.0",
								CATSHOURS: "0.00",
								CATSQUANTITY: "0.0",
								CPR_EXTID: "",
								CPR_GUID: "",
								CPR_OBJGEXTID: "",
								CPR_OBJGUID: "",
								CPR_OBJTYPE: "",
								ENDUZ: "000000",
								ERNAM: "",
								ERSDA: "",
								ERSTM: "",
								ERUZU: "",
								EXTAPPLICATION: "",
								EXTDOCUMENTNO: "",
								EXTSYSTEM: "",
								FUNC_AREA: "",
								FUND: "",
								GRANT_NBR: "",
								HRBUDGET_PD: "",
								HRCOSTASG: "0",
								HRFUNC_AREA: "",
								HRFUND: "",
								HRGRANT_NBR: "",
								HRKOSTL: "",
								HRLSTAR: "",
								KAPAR: "",
								KAPID: "00000000",
								KOKRS: "",
								LAEDA: "",
								LAETM: "",
								LGART: "",
								LOGSYS: "",
								LONGTEXT: "",
								LONGTEXT_DATA: "",
								LSTAR: "",
								LSTNR: "",
								LTXA1: "",
								MEINH: "",
								OFMNW: "0.0",
								OTYPE: "",
								PAOBJNR: "0000000000",
								PEDD: null,
								PERNR: "00000000",
								PLANS: "00000000",
								POSID: aPosIds[p],
								PRAKN: "",
								PRAKZ: "0000",
								PRICE: "0.0",
								RAPLZL: "00000000",
								RAUFNR: "",
								RAUFPL: "0000000000",
								REASON: "",
								REFCOUNTER: "000000000000",
								REINR: "0000000000",
								RKDAUF: "",
								RKDPOS: "000000",
								RKOSTL: "",
								RKSTR: "",
								RNPLNR: "",
								RPROJ: "00000000",
								RPRZNR: "",
								SBUDGET_PD: "",
								SEBELN: "",
								SEBELP: "00000",
								SKOSTL: "",
								SPLIT: "0",
								SPRZNR: "",
								STATKEYFIG: "",
								STATUS: "",
								S_FUNC_AREA: "",
								S_FUND: "",
								S_GRANT_NBR: "",
								TASKCOMPONENT: "",
								TASKCOUNTER: "",
								TASKLEVEL: "",
								TASKTYPE: "",
								TCURR: "",
								TRFGR: "",
								TRFST: "",
								UNIT: "",
								UVORN: "",
								VERSL: "",
								VORNR: "",
								VTKEN: "",
								WABLNR: "",
								WAERS: "",
								WERKS: "",
								WORKDATE: date1,
								WORKITEMID: "000000000000",
								WTART: ""
							},
							TimeEntryOperation: ""
						};
						var sumHours = 0;
						for (var j = 0; j < daterecords[0].TimeEntries.results.length; j++) {
							daterecords[0].TimeEntries.results[j].totalHours = sumHours.toFixed(2);
							if ((j + 1) === daterecords[0].TimeEntries.results.length) {
								daterecords[0].TimeEntries.results[j].addButton = true;
								daterecords[0].TimeEntries.results[j].addButtonEnable = true;
								daterecords[0].TimeEntries.results[j].deleteButton = true;
								daterecords[0].TimeEntries.results[j].deleteButtonEnable = true;
								daterecords[0].TimeEntries.results[j].SetDraft = false;
								daterecords[0].TimeEntries.results[j].HeaderData = {
									target: daterecords[0].TargetHours,
									sum: sumHours,
									date: new Date(i),
									addButton: true,
									highlight: false
								};
							} else {
								daterecords[0].TimeEntries.results[j].addButton = false;
								daterecords[0].TimeEntries.results[j].deleteButton = true;
								daterecords[0].TimeEntries.results[j].deleteButtonEnable = true;
								daterecords[0].TimeEntries.results[j].SetDraft = false;
								daterecords[0].TimeEntries.results[j].HeaderData = {
									target: daterecords[0].TargetHours,
									sum: sumHours,
									date: new Date(i),
									addButton: false,
									highlight: false
								};
							}
						}
						if (daterecords[0].TimeEntries.results.length !== 0) {
							for (var j = 0; j < daterecords[0].TimeEntries.results.length; j++) {
								var aRow = daterecords[0].TimeEntries.results.find(function (entry, id) {
									return entry.TimeEntryDataFields.POSID === aPosIds[p];
								});
								if (aRow) {
									aRow.target = daterecords[0].TargetHours;
									/*aRow.TimeEntryDataFields.CATSHOURS = parseFloat(daterecords[0].TimeEntries.results[j].TimeEntryDataFields
										.CATSHOURS).toFixed(2);*/
									if (aRow.TimeEntryDataFields.STATUS !== '10' && aRow.TimeEntryDataFields
										.STATUS !== '40') {
										sumHours = parseFloat(sumHours) + parseFloat(aRow.TimeEntryDataFields
											.CATSHOURS);
									}
									timedata.push(aRow);
								} else {
									timedata.push(recordTemplate);
								}
								break;
							}
						} else {
							timedata.push(recordTemplate);
						}
					}
					startDate = that.getFirstDayOfWeek(oDate, that.firstDayOfWeek);
					startDate.setHours(0);
					startDate.setMinutes(0);
					startDate.setSeconds(0);
					startDate.setMilliseconds(0);
				}
				startDate = that.getFirstDayOfWeek(oDate, that.firstDayOfWeek);
				startDate.setHours(0);
				startDate.setMinutes(0);
				startDate.setSeconds(0);
				startDate.setMilliseconds(0);
				that.mCalendar.setStartDate(startDate);
			} else {}
			// add admint types data
			var aAwarts = [];
			for (var i = 0; i < entries.length; i++) {
				if (entries[i].TimeEntries.results.length !== 0) {
					for (var j = 0; j < entries[i].TimeEntries.results.length; j++) {
						if (entries[i].TimeEntries.results[j].TimeEntryDataFields.AWART !== "WRK") {
							aAwarts.push(entries[i].TimeEntries.results[j].TimeEntryDataFields.AWART);
						}
					}
				}
			}
			aAwarts = aAwarts.filter(function (item, index, inputArray) {
				return inputArray.indexOf(item) == index && inputArray.indexOf(item) !== "";
			});
			aAwarts = aAwarts.filter(function (row, index) {
				return row;
			});
			for (var j = 0; j < aAwarts.length; j++) {
				for (var i = startDate; i <= endDate; i.setDate(i.getDate() + 1)) {
					var dateSearch = i;
					var daterecords = $.grep(entries, function (element, index) {
						var date = new Date(element.CaleDate.substring(0, 4) + "-" + element.CaleDate.substring(4, 6) + "-" + element.CaleDate.substring(
							6, 8));
						date = new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
						return that.oFormatyyyymmdd.format(date) == that.oFormatyyyymmdd.format(dateSearch) && element.Status !== '99';
					});
					if (daterecords.length === 0) {
						continue;
					}
					var date1 = new Date(daterecords[0].CaleDate.substring(0, 4) + "-" + daterecords[0].CaleDate.substring(4, 6) + "-" +
						daterecords[
							0].CaleDate.substring(
							6, 8));
					date1 = new Date(date1.getUTCFullYear(), date1.getUTCMonth(), date1.getUTCDate());
					startDate.setHours(0);
					startDate.setMinutes(0);
					startDate.setSeconds(0);
					startDate.setMilliseconds(0);
					var recordTemplate = {
						AllowEdit: "",
						AllowRelease: "",
						AssignmentId: "",
						AssignmentName: "",
						CatsDocNo: "",
						Counter: "",
						Pernr: this.empID,
						RefCounter: "",
						RejReason: "",
						Status: "",
						SetDraft: false,
						HeaderData: {
							target: "0.00",
							sum: "0.00",
							date: date1,
							addButton: false,
							highlight: false
						},
						target: "0.00",
						TimeEntryDataFields: {
							AENAM: "",
							ALLDF: "",
							APDAT: null,
							APNAM: "",
							ARBID: "00000000",
							ARBPL: "",
							AUERU: "",
							AUFKZ: "",
							AUTYP: "00",
							AWART: aAwarts[j],
							BEGUZ: "000000",
							BELNR: "",
							BEMOT: "",
							BUDGET_PD: "",
							BUKRS: "",
							BWGRL: "0.0",
							CATSAMOUNT: "0.0",
							CATSHOURS: "0.00",
							CATSQUANTITY: "0.0",
							CPR_EXTID: "",
							CPR_GUID: "",
							CPR_OBJGEXTID: "",
							CPR_OBJGUID: "",
							CPR_OBJTYPE: "",
							ENDUZ: "000000",
							ERNAM: "",
							ERSDA: "",
							ERSTM: "",
							ERUZU: "",
							EXTAPPLICATION: "",
							EXTDOCUMENTNO: "",
							EXTSYSTEM: "",
							FUNC_AREA: "",
							FUND: "",
							GRANT_NBR: "",
							HRBUDGET_PD: "",
							HRCOSTASG: "0",
							HRFUNC_AREA: "",
							HRFUND: "",
							HRGRANT_NBR: "",
							HRKOSTL: "",
							HRLSTAR: "",
							KAPAR: "",
							KAPID: "00000000",
							KOKRS: "",
							LAEDA: "",
							LAETM: "",
							LGART: "",
							LOGSYS: "",
							LONGTEXT: "",
							LONGTEXT_DATA: "",
							LSTAR: "",
							LSTNR: "",
							LTXA1: "",
							MEINH: "",
							OFMNW: "0.0",
							OTYPE: "",
							PAOBJNR: "0000000000",
							PEDD: null,
							PERNR: "00000000",
							PLANS: "00000000",
							POSID: "",
							PRAKN: "",
							PRAKZ: "0000",
							PRICE: "0.0",
							RAPLZL: "00000000",
							RAUFNR: "",
							RAUFPL: "0000000000",
							REASON: "",
							REFCOUNTER: "000000000000",
							REINR: "0000000000",
							RKDAUF: "",
							RKDPOS: "000000",
							RKOSTL: "",
							RKSTR: "",
							RNPLNR: "",
							RPROJ: "00000000",
							RPRZNR: "",
							SBUDGET_PD: "",
							SEBELN: "",
							SEBELP: "00000",
							SKOSTL: "",
							SPLIT: "0",
							SPRZNR: "",
							STATKEYFIG: "",
							STATUS: "",
							S_FUNC_AREA: "",
							S_FUND: "",
							S_GRANT_NBR: "",
							TASKCOMPONENT: "",
							TASKCOUNTER: "",
							TASKLEVEL: "",
							TASKTYPE: "",
							TCURR: "",
							TRFGR: "",
							TRFST: "",
							UNIT: "",
							UVORN: "",
							VERSL: "",
							VORNR: "",
							VTKEN: "",
							WABLNR: "",
							WAERS: "",
							WERKS: "",
							WORKDATE: date1,
							WORKITEMID: "000000000000",
							WTART: ""
						},
						TimeEntryOperation: ""
					};

					if (daterecords[0].TimeEntries.results.length !== 0) {
						for (var k = 0; k < daterecords[0].TimeEntries.results.length; k++) {
							var aRow = daterecords[0].TimeEntries.results.find(function (entry, id) {
								return entry.TimeEntryDataFields.AWART === aAwarts[j];
							});
							if (aRow) {
								aRow.target = daterecords[0].TargetHours;
								aRow.TimeEntryDataFields.CATSHOURS = parseFloat(daterecords[0].TimeEntries.results[k].TimeEntryDataFields
									.CATSHOURS).toFixed(2);
								if (aRow.TimeEntryDataFields.STATUS !== '10' && aRow.TimeEntryDataFields
									.STATUS !== '40') {
									sumHours = parseFloat(sumHours) + parseFloat(aRow.TimeEntryDataFields
										.CATSHOURS);
								}
								timedata.push(aRow);
							} else {
								timedata.push(recordTemplate);
							}
							break;
						}
					} else {
						timedata.push(recordTemplate);
					}
				}
				startDate = that.getFirstDayOfWeek(oDate, that.firstDayOfWeek);
				startDate.setHours(0);
				startDate.setMinutes(0);
				startDate.setSeconds(0);
				startDate.setMilliseconds(0);
			}
			startDate = that.getFirstDayOfWeek(oDate, that.firstDayOfWeek);
			startDate.setHours(0);
			startDate.setMinutes(0);
			startDate.setSeconds(0);
			startDate.setMilliseconds(0);
			that.mCalendar.setStartDate(startDate);
			for (var i = 0; i < timedata.length; i++) {
				if (timedata[i].TimeEntryDataFields.STATUS === "10") {
					timedata[i].SetDraft = true;
				}
				var element = $.grep(statusdata, function (element, index) {
					if (timedata[i].TimeEntryDataFields.STATUS && timedata[i].TimeEntryDataFields.STATUS != "")
						return element.key === timedata[i].TimeEntryDataFields.STATUS;
				});
				if (element && element.length > 0) {
					continue;
				}
				timedata[i].highlight = "None";
				timedata[i].valueState = "None";
			}
			this.getModel("TimeData").setData(timedata);
			this.setModel(new JSONModel(statusdata), "Status");
		},
		bindTable: function (startDate, endDate) {
			var that = this;
			var oDate = new Date(that.mCalendar.getStartDate());
			var entries = $.extend(true, [], this.getModel('TimeEntries').getData());
			var oModel = new sap.ui.model.json.JSONModel();
			var oModel1 = new sap.ui.model.json.JSONModel();
			var timedata = [];
			var timedataAdmin = [];
			var statusdata = [{
				key: '100',
				text: '{i18n>allStatus}'
			}, {
				key: '10'
			}, {
				key: '20'
			}, {
				key: '30'
			}, {
				key: '40'
			}];
			for (var i = startDate; i <= endDate; i.setDate(i.getDate() + 1)) {
				var dateSearch = i;
				var daterecords = $.grep(entries, function (element, index) {
					var date = new Date(element.CaleDate.substring(0, 4) + "-" + element.CaleDate.substring(4, 6) + "-" + element.CaleDate.substring(
						6, 8));
					date = new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
					return that.oFormatyyyymmdd.format(date) == that.oFormatyyyymmdd.format(dateSearch) && element.Status !== '99';
				});
				if (daterecords.length === 0) {
					continue;
				}
				startDate.setHours(0);
				startDate.setMinutes(0);
				startDate.setSeconds(0);
				var recordTemplate = {
					AllowEdit: "",
					AllowRelease: "",
					AssignmentId: "",
					AssignmentName: "",
					CatsDocNo: "",
					Counter: "",
					Pernr: this.empID,
					RefCounter: "",
					RejReason: "",
					Status: "",
					SetDraft: false,
					HeaderData: {
						target: daterecords[0].TargetHours,
						sum: "0.00",
						date: new Date(i),
						addButton: false,
						highlight: false
					},
					target: daterecords[0].TargetHours,
					TimeEntryDataFields: {
						AENAM: "",
						ALLDF: "",
						APDAT: null,
						APNAM: "",
						ARBID: "00000000",
						ARBPL: "",
						AUERU: "",
						AUFKZ: "",
						AUTYP: "00",
						AWART: "",
						BEGUZ: "000000",
						BELNR: "",
						BEMOT: "",
						BUDGET_PD: "",
						BUKRS: "",
						BWGRL: "0.0",
						CATSAMOUNT: "0.0",
						CATSHOURS: "0.00",
						CATSQUANTITY: "0.0",
						CPR_EXTID: "",
						CPR_GUID: "",
						CPR_OBJGEXTID: "",
						CPR_OBJGUID: "",
						CPR_OBJTYPE: "",
						ENDUZ: "000000",
						ERNAM: "",
						ERSDA: "",
						ERSTM: "",
						ERUZU: "",
						EXTAPPLICATION: "",
						EXTDOCUMENTNO: "",
						EXTSYSTEM: "",
						FUNC_AREA: "",
						FUND: "",
						GRANT_NBR: "",
						HRBUDGET_PD: "",
						HRCOSTASG: "0",
						HRFUNC_AREA: "",
						HRFUND: "",
						HRGRANT_NBR: "",
						HRKOSTL: "",
						HRLSTAR: "",
						KAPAR: "",
						KAPID: "00000000",
						KOKRS: "",
						LAEDA: "",
						LAETM: "",
						LGART: "",
						LOGSYS: "",
						LONGTEXT: "",
						LONGTEXT_DATA: "",
						LSTAR: "",
						LSTNR: "",
						LTXA1: "",
						MEINH: "",
						OFMNW: "0.0",
						OTYPE: "",
						PAOBJNR: "0000000000",
						PEDD: null,
						PERNR: "00000000",
						PLANS: "00000000",
						POSID: "",
						PRAKN: "",
						PRAKZ: "0000",
						PRICE: "0.0",
						RAPLZL: "00000000",
						RAUFNR: "",
						RAUFPL: "0000000000",
						REASON: "",
						REFCOUNTER: "000000000000",
						REINR: "0000000000",
						RKDAUF: "",
						RKDPOS: "000000",
						RKOSTL: "",
						RKSTR: "",
						RNPLNR: "",
						RPROJ: "00000000",
						RPRZNR: "",
						SBUDGET_PD: "",
						SEBELN: "",
						SEBELP: "00000",
						SKOSTL: "",
						SPLIT: "0",
						SPRZNR: "",
						STATKEYFIG: "",
						STATUS: "",
						S_FUNC_AREA: "",
						S_FUND: "",
						S_GRANT_NBR: "",
						TASKCOMPONENT: "",
						TASKCOUNTER: "",
						TASKLEVEL: "",
						TASKTYPE: "",
						TCURR: "",
						TRFGR: "",
						TRFST: "",
						UNIT: "",
						UVORN: "",
						VERSL: "",
						VORNR: "",
						VTKEN: "",
						WABLNR: "",
						WAERS: "",
						WERKS: "",
						WORKDATE: new Date(i),
						WORKITEMID: "000000000000",
						WTART: ""
					},
					TimeEntryOperation: ""
				};
				if (daterecords[0].TimeEntries.results.length > 1) {
					daterecords[0].TimeEntries.results = daterecords[0].TimeEntries.results.sort(function (obj1, obj2) {
						if (parseFloat(obj1.TimeEntryDataFields.CATSHOURS) > parseFloat(obj2.TimeEntryDataFields.CATSHOURS) || obj1.Status ===
							'99') {
							return -1;
						} else if (parseFloat(obj2.TimeEntryDataFields.CATSHOURS) > parseFloat(obj1.TimeEntryDataFields.CATSHOURS) || obj2.Status ===
							'99') {
							return 1;
						}
					});
				}
				var sumHours = 0;
				for (var j = 0; j < daterecords[0].TimeEntries.results.length; j++) {
					daterecords[0].TimeEntries.results[j].target = daterecords[0].TargetHours;
					daterecords[0].TimeEntries.results[j].TimeEntryDataFields.CATSHOURS = parseFloat(daterecords[0].TimeEntries.results[j].TimeEntryDataFields
						.CATSHOURS).toFixed(2);
					if (daterecords[0].TimeEntries.results[j].TimeEntryDataFields.STATUS !== '10' && daterecords[0].TimeEntries.results[j].TimeEntryDataFields
						.STATUS !== '40') {
						sumHours = parseFloat(sumHours) + parseFloat(daterecords[0].TimeEntries.results[j].TimeEntryDataFields
							.CATSHOURS);
					}
					timedata.push(daterecords[0].TimeEntries.results[j]);
				}
				for (var j = 0; j < daterecords[0].TimeEntries.results.length; j++) {
					daterecords[0].TimeEntries.results[j].totalHours = sumHours.toFixed(2);
					if ((j + 1) === daterecords[0].TimeEntries.results.length) {
						daterecords[0].TimeEntries.results[j].addButton = true;
						daterecords[0].TimeEntries.results[j].addButtonEnable = true;
						daterecords[0].TimeEntries.results[j].deleteButton = true;
						daterecords[0].TimeEntries.results[j].deleteButtonEnable = true;
						daterecords[0].TimeEntries.results[j].SetDraft = false;
						daterecords[0].TimeEntries.results[j].HeaderData = {
							target: daterecords[0].TargetHours,
							sum: sumHours,
							date: new Date(i),
							addButton: true,
							highlight: false
						};
					} else {
						daterecords[0].TimeEntries.results[j].addButton = false;
						daterecords[0].TimeEntries.results[j].deleteButton = true;
						daterecords[0].TimeEntries.results[j].deleteButtonEnable = true;
						daterecords[0].TimeEntries.results[j].SetDraft = false;
						daterecords[0].TimeEntries.results[j].HeaderData = {
							target: daterecords[0].TargetHours,
							sum: sumHours,
							date: new Date(i),
							addButton: false,
							highlight: false
						};
					}
				}
				if (daterecords[0].TimeEntries.results.length === 0 || (daterecords[0].TimeEntries.results.length === 1 && daterecords[0].TimeEntries
						.results[0].Status === '99')) {
					recordTemplate.totalHours = sumHours.toFixed(2);
					recordTemplate.addButton = true;
					recordTemplate.HeaderData.addButton = true;
					recordTemplate.addButtonEnable = false;
					recordTemplate.deleteButtonEnable = false;
					recordTemplate.SetDraft = false;
					timedata.push(recordTemplate);
				}

			}
			var startdate = that.getFirstDayOfWeek(oDate, that.firstDayOfWeek);
			that.dateFrom = startdate;
			for (var i = 0; i < timedata.length; i++) {
				if (timedata[i].TimeEntryDataFields.STATUS === "10") {
					timedata[i].SetDraft = true;
				}
				var element = $.grep(statusdata, function (element, index) {
					if (timedata[i].TimeEntryDataFields.STATUS && timedata[i].TimeEntryDataFields.STATUS != "")
						return element.key === timedata[i].TimeEntryDataFields.STATUS;
				});
				if (element && element.length > 0) {
					continue;
				}
				timedata[i].highlight = "None";
				timedata[i].valueState = "None";
			}
			for (var i = 0; i < timedataAdmin.length; i++) {
				if (timedataAdmin[i].TimeEntryDataFields.STATUS === "10") {
					timedataAdmin[i].SetDraft = true;
				}
				var element = $.grep(statusdata, function (element, index) {
					if (timedataAdmin[i].TimeEntryDataFields.STATUS && timedataAdmin[i].TimeEntryDataFields.STATUS != "")
						return element.key === timedataAdmin[i].TimeEntryDataFields.STATUS;
				});
				if (element && element.length > 0) {
					continue;
				}
				timedataAdmin[i].highlight = "None";
				timedataAdmin[i].valueState = "None";
			}
			// pushing the POSID to assgimenID field, so that wbs combobox will display the POSID text
			var oWorkListModel = this.getModel("Worklist");
			var aWorkListData = oWorkListModel.getData();
			for (var l = 0; l < timedata.length; l++) {
				if (timedata[l].TimeEntryDataFields.POSID) {
					timedata[l].AssignmentId = timedata[l].TimeEntryDataFields.POSID;
					var aRow = aWorkListData.find(function (entry, id) {
						return entry.WorkListDataFields.POSID === timedata[l].TimeEntryDataFields.POSID;
					});
					if (aRow) {
						timedata[l].AssignmentName = aRow.WorkListDataFields.Post1;
					}
				}
			}
			oModel1.setData(timedataAdmin);
			this.getModel("TimeData").setData(timedata);
			this.setModel(oModel1, "TimeDataAdmin");
			//	}
			this.setModel(new JSONModel(statusdata), "Status");
			//set missing hours text in ui for a week
			var totalHoursWeek = 0,
				targetHoursWeek = 0;
			for (var l = 0; l < timedata.length; l++) {
				totalHoursWeek = totalHoursWeek + parseFloat(timedata[l].totalHours);
				targetHoursWeek = targetHoursWeek + parseFloat(timedata[l].target);
			}
			var oMissing = (parseFloat(targetHoursWeek) - parseFloat(totalHoursWeek)) > parseFloat(0) ? (parseFloat(targetHoursWeek) -
				parseFloat(totalHoursWeek)) : parseFloat(
				0);
			this.byId("idmissinghours").setText(this.oBundle.getText("mobMissingHours", [parseFloat(oMissing).toFixed(2)]));
		},
		bindTablePhone: function (data, startDate, endDate) {
			var that = this;
			var oDate = new Date(that.mCalendar.getStartDate());
			var entries = $.extend(true, [], this.getModel('TimeEntriesCopy').getData());
			var oModel = new sap.ui.model.json.JSONModel();
			var oModel1 = new sap.ui.model.json.JSONModel();
			var timedata = [];
			var timedataAdmin = [];
			var statusdata = [{
				key: '100',
				text: '{i18n>allStatus}'
			}, {
				key: '10'
			}, {
				key: '20'
			}, {
				key: '30'
			}, {
				key: '40'
			}];
			for (var i = startDate; i <= endDate; i.setDate(i.getDate() + 1)) {
				var dateSearch = i;
				var daterecords = $.grep(entries, function (element, index) {
					var date = new Date(element.CaleDate.substring(0, 4) + "-" + element.CaleDate.substring(4, 6) + "-" + element.CaleDate.substring(
						6, 8));
					date = new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
					return that.oFormatyyyymmdd.format(date) == that.oFormatyyyymmdd.format(dateSearch) && element.Status !== '99';
				});
				if (daterecords.length === 0) {
					continue;
				}
				startDate.setHours(0);
				startDate.setMinutes(0);
				startDate.setSeconds(0);
				var recordTemplate = {
					AllowEdit: "",
					AllowRelease: "",
					AssignmentId: "",
					AssignmentName: "",
					CatsDocNo: "",
					Counter: "",
					Pernr: this.empID,
					RefCounter: "",
					RejReason: "",
					Status: "",
					SetDraft: false,
					HeaderData: {
						target: daterecords[0].TargetHours,
						sum: "0.00",
						date: new Date(i),
						addButton: false,
						highlight: false
					},
					target: daterecords[0].TargetHours,
					TimeEntryDataFields: {
						AENAM: "",
						ALLDF: "",
						APDAT: null,
						APNAM: "",
						ARBID: "00000000",
						ARBPL: "",
						AUERU: "",
						AUFKZ: "",
						AUTYP: "00",
						AWART: "",
						BEGUZ: "000000",
						BELNR: "",
						BEMOT: "",
						BUDGET_PD: "",
						BUKRS: "",
						BWGRL: "0.0",
						CATSAMOUNT: "0.0",
						CATSHOURS: "0.00",
						CATSQUANTITY: "0.0",
						CPR_EXTID: "",
						CPR_GUID: "",
						CPR_OBJGEXTID: "",
						CPR_OBJGUID: "",
						CPR_OBJTYPE: "",
						ENDUZ: "000000",
						ERNAM: "",
						ERSDA: "",
						ERSTM: "",
						ERUZU: "",
						EXTAPPLICATION: "",
						EXTDOCUMENTNO: "",
						EXTSYSTEM: "",
						FUNC_AREA: "",
						FUND: "",
						GRANT_NBR: "",
						HRBUDGET_PD: "",
						HRCOSTASG: "0",
						HRFUNC_AREA: "",
						HRFUND: "",
						HRGRANT_NBR: "",
						HRKOSTL: "",
						HRLSTAR: "",
						KAPAR: "",
						KAPID: "00000000",
						KOKRS: "",
						LAEDA: "",
						LAETM: "",
						LGART: "",
						LOGSYS: "",
						LONGTEXT: "",
						LONGTEXT_DATA: "",
						LSTAR: "",
						LSTNR: "",
						LTXA1: "",
						MEINH: "",
						OFMNW: "0.0",
						OTYPE: "",
						PAOBJNR: "0000000000",
						PEDD: null,
						PERNR: "00000000",
						PLANS: "00000000",
						POSID: "",
						PRAKN: "",
						PRAKZ: "0000",
						PRICE: "0.0",
						RAPLZL: "00000000",
						RAUFNR: "",
						RAUFPL: "0000000000",
						REASON: "",
						REFCOUNTER: "000000000000",
						REINR: "0000000000",
						RKDAUF: "",
						RKDPOS: "000000",
						RKOSTL: "",
						RKSTR: "",
						RNPLNR: "",
						RPROJ: "00000000",
						RPRZNR: "",
						SBUDGET_PD: "",
						SEBELN: "",
						SEBELP: "00000",
						SKOSTL: "",
						SPLIT: "0",
						SPRZNR: "",
						STATKEYFIG: "",
						STATUS: "",
						S_FUNC_AREA: "",
						S_FUND: "",
						S_GRANT_NBR: "",
						TASKCOMPONENT: "",
						TASKCOUNTER: "",
						TASKLEVEL: "",
						TASKTYPE: "",
						TCURR: "",
						TRFGR: "",
						TRFST: "",
						UNIT: "",
						UVORN: "",
						VERSL: "",
						VORNR: "",
						VTKEN: "",
						WABLNR: "",
						WAERS: "",
						WERKS: "",
						WORKDATE: new Date(i),
						WORKITEMID: "000000000000",
						WTART: ""
					},
					TimeEntryOperation: ""
				};
				if (daterecords[0].TimeEntries.results.length > 1) {
					daterecords[0].TimeEntries.results = daterecords[0].TimeEntries.results.sort(function (obj1, obj2) {
						if (parseFloat(obj1.TimeEntryDataFields.CATSHOURS) > parseFloat(obj2.TimeEntryDataFields.CATSHOURS) || obj1.Status ===
							'99') {
							return -1;
						} else if (parseFloat(obj2.TimeEntryDataFields.CATSHOURS) > parseFloat(obj1.TimeEntryDataFields.CATSHOURS) || obj2.Status ===
							'99') {
							return 1;
						}
					});
				}
				var sumHours = 0;
				for (var j = 0; j < daterecords[0].TimeEntries.results.length; j++) {
					daterecords[0].TimeEntries.results[j].target = daterecords[0].TargetHours;
					daterecords[0].TimeEntries.results[j].TimeEntryDataFields.CATSHOURS = parseFloat(daterecords[0].TimeEntries.results[j].TimeEntryDataFields
						.CATSHOURS).toFixed(2);
					if (daterecords[0].TimeEntries.results[j].TimeEntryDataFields.STATUS !== '10' && daterecords[0].TimeEntries.results[j].TimeEntryDataFields
						.STATUS !== '40') {
						sumHours = parseFloat(sumHours) + parseFloat(daterecords[0].TimeEntries.results[j].TimeEntryDataFields
							.CATSHOURS);
					}
					// don't push admin type record to timedata model
					if (sap.ui.Device.system.phone !== true) {
						if (daterecords[0].TimeEntries.results[j].TimeEntryDataFields.AWART === "WRK") {
							timedata.push(daterecords[0].TimeEntries.results[j]);
						} else {
							timedata.push(recordTemplate);
						}
					} else {
						timedata.push(daterecords[0].TimeEntries.results[j]);
					}
				}
				for (var j = 0; j < daterecords[0].TimeEntries.results.length; j++) {
					daterecords[0].TimeEntries.results[j].totalHours = sumHours.toFixed(2);
					if ((j + 1) === daterecords[0].TimeEntries.results.length) {
						daterecords[0].TimeEntries.results[j].addButton = true;
						daterecords[0].TimeEntries.results[j].addButtonEnable = true;
						daterecords[0].TimeEntries.results[j].deleteButton = true;
						daterecords[0].TimeEntries.results[j].deleteButtonEnable = true;
						daterecords[0].TimeEntries.results[j].SetDraft = false;
						daterecords[0].TimeEntries.results[j].HeaderData = {
							target: daterecords[0].TargetHours,
							sum: sumHours,
							date: new Date(i),
							addButton: true,
							highlight: false
						};
					} else {
						daterecords[0].TimeEntries.results[j].addButton = false;
						daterecords[0].TimeEntries.results[j].deleteButton = true;
						daterecords[0].TimeEntries.results[j].deleteButtonEnable = true;
						daterecords[0].TimeEntries.results[j].SetDraft = false;
						daterecords[0].TimeEntries.results[j].HeaderData = {
							target: daterecords[0].TargetHours,
							sum: sumHours,
							date: new Date(i),
							addButton: false,
							highlight: false
						};
					}
				}
				if (daterecords[0].TimeEntries.results.length === 0 || (daterecords[0].TimeEntries.results.length === 1 && daterecords[0].TimeEntries
						.results[0].Status === '99')) {
					recordTemplate.totalHours = sumHours.toFixed(2);
					recordTemplate.addButton = true;
					recordTemplate.HeaderData.addButton = true;
					recordTemplate.addButtonEnable = false;
					recordTemplate.deleteButtonEnable = false;
					recordTemplate.SetDraft = false;
					timedata.push(recordTemplate);
				}

			}
			for (var i = 0; i < timedata.length; i++) {
				if (timedata[i].TimeEntryDataFields.STATUS === "10") {
					timedata[i].SetDraft = true;
				}
				var element = $.grep(statusdata, function (element, index) {
					if (timedata[i].TimeEntryDataFields.STATUS && timedata[i].TimeEntryDataFields.STATUS != "")
						return element.key === timedata[i].TimeEntryDataFields.STATUS;
				});
				if (element && element.length > 0) {
					continue;
				}
				timedata[i].highlight = "None";
				timedata[i].valueState = "None";
			}
			for (var i = 0; i < timedataAdmin.length; i++) {
				if (timedataAdmin[i].TimeEntryDataFields.STATUS === "10") {
					timedataAdmin[i].SetDraft = true;
				}
				var element = $.grep(statusdata, function (element, index) {
					if (timedataAdmin[i].TimeEntryDataFields.STATUS && timedataAdmin[i].TimeEntryDataFields.STATUS != "")
						return element.key === timedataAdmin[i].TimeEntryDataFields.STATUS;
				});
				if (element && element.length > 0) {
					continue;
				}
				timedataAdmin[i].highlight = "None";
				timedataAdmin[i].valueState = "None";
			}
			// pushing the POSID to assgimenID field, so that wbs combobox will display the POSID text
			var oWorkListModel = this.getModel("Worklist");
			var aWorkListData = oWorkListModel.getData();
			for (var l = 0; l < timedata.length; l++) {
				if (timedata[l].TimeEntryDataFields.POSID) {
					timedata[l].AssignmentId = timedata[l].TimeEntryDataFields.POSID;
					var aRow = aWorkListData.find(function (entry, id) {
						return entry.WorkListDataFields.POSID === timedata[l].TimeEntryDataFields.POSID;
					});
					if (aRow) {
						timedata[l].AssignmentName = aRow.WorkListDataFields.Post1;
					} else {
						timedata[l].AssignmentName = timedata[l].TimeEntryDataFields.POSID;
					}
				}
			}
			oModel.setData(timedata);
			this.setModel(oModel, "TimeDataCopy");
			//TODO : awart name and id to be added
			this.setModel(new JSONModel(statusdata), "Status");
		},
		getWorklistFields: function (oPernr) {
			var that = this;
			var oModel = new sap.ui.model.json.JSONModel();
			var a = new sap.ui.model.Filter({
				path: "Pernr",
				operator: sap.ui.model.FilterOperator.EQ,
				value1: oPernr
			});
			var b = new sap.ui.model.Filter({
				path: "SelWorkList",
				operator: sap.ui.model.FilterOperator.EQ,
				value1: "X"
			});
			var f = [];
			f.push(a);
			f.push(b);
			var mParameters = {
				filters: f,
				success: function (oData, oResponse) {
					var worklistFields = $.extend(true, [], oData.results);
					//add Name Field to WorklistFields
					var nameField = [];
					nameField.FieldName = "NAME";
					nameField.FieldLength = 30;
					nameField.FieldType = "C";
					nameField.IsReadOnly = "FALSE";
					nameField.SelWorkList = "X";
					nameField.FieldLabel = that.oBundle.getText("name");
					worklistFields.splice(0, 0, nameField);
					//add Range Field to WorklistFields
					var rangeField = [];
					rangeField.FieldName = "RANGE";
					rangeField.FieldLabel = that.oBundle.getText("validPeriod");
					rangeField.IsReadOnly = "FALSE";
					rangeField.SelWorkList = "X";
					worklistFields.splice(1, 0, rangeField);
					oModel.setData(worklistFields);
					that.worklistFields = worklistFields;
					that.setModel(oModel, "WorklistProfileFields");
				},
				error: function (oError) {
					that.oErrorHandler.processError(oError);
				}
			};
			this.oDataModel.read('/ProfileFieldCollection', mParameters);
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
			// if (this.dateFrom.getTime() < this.getModel("TimeEntries").getData()[0].JoiningDate.getTime()) {
			// 	this.mCalendar.setMinDate(this.dateFrom);
			// 	this.mCalendar.setStartDate(this.dateFrom);
			// }
			var oItems = this.byId("ENTRY_LIST_CONTENTS").getItems();
			var oItems1 = this.entryListAbsence.getItems();
			var oControl = this.getModel("controls");
			var bCopied = oControl.getProperty("/entryCopied");
			var bChanged = that.getModel("controls").getProperty("/isDataChanged");
			var bChangedItems = that.getCheckChangedItems();
			if (bChangedItems) {
				var sText = this.oBundle.getText("unsavedData");
				sap.m.MessageBox.confirm(sText, {
					title: "Confirmation",
					initialFocus: null,
					actions: ["Submit", "Leave Page"],
					onClose: function (oAction) {
						if (oAction === "Submit") {
							this.onSendApproval1();
						} else {
							oControl.setProperty("/entryCopied", false);
							this.getModel("controls").setProperty("/isDataChanged", false);
							this.getWorkList(new Date(this.dateFrom), new Date(this.dateTo));
							this.getTimeEntries(new Date(this.dateFrom), new Date(this.dateTo));
							this.byId("Add_AdminTime").setEnabled(true);
						}
					}.bind(this)
				});
			} else {
				this.getWorkList(new Date(this.dateFrom), new Date(this.dateTo));
				this.getTimeEntries(new Date(this.dateFrom), new Date(this.dateTo));
				this.initializeTable();
				this.byId("Add_AdminTime").setEnabled(true);
			}
		},
		onStartDateChangeMonth: function (oEvent) {
			var that = this;
			var oCalendar = oEvent.getSource();
			var curDate = new Date();
			curDate = new Date(oCalendar.getStartDate());
			this.dateFrom = this.getFirstDayOfWeek(oCalendar.getStartDate(), that.firstDayOfWeek);
			curDate.setMonth(curDate.getMonth() + 1, 0);
			this.dateTo = this.getLastDayOfWeek(curDate, that.firstDayOfWeek);
			that.getTimeEntriesMonthCalendar(new Date(that.dateFrom), new Date(that.dateTo));
		},
		getEmployeeDetails: function (empID) {
			var that = this;
			var f = [];
			var c = new sap.ui.model.Filter({
				path: "EmployeeNumber",
				operator: sap.ui.model.FilterOperator.EQ,
				value1: this.empID
			});
			f.push(c);
			this.oCEModel.createKey("EmployeeDetailSet", {
				EmployeeNumber: empID,
				ApplicationId: 'CATS'
			});
			var mParameters = {
				filters: f,
				success: function (oData, oResponse) {
					this.busyDialog.close();
					var aEmpDataModel = this.getEmpDetailModel();
					aEmpDataModel.setData(oData);
				}.bind(this),
				error: function (oError) {
					this.busyDialog.close();
					that.oErrorHandler.processError(oError);
				}.bind(this)
			};
			this.busyDialog.open();
			this.oCEModel.read('/EmployeeDetailSet', mParameters);
		},

		onViewMonth: function (oEvent) {
			var oButton = oEvent.getSource(),
				oView = this.getView();
			// create popover
			if (!this._pPopover) {
				this._pPopover = Fragment.load({
					id: oView.getId(),
					name: "cgdc.timesheet.view.fragment.PopoverCalendar",
					controller: this
				}).then(function (oPopover) {
					oView.addDependent(oPopover);
					return oPopover;
				});
			}
			this._pPopover.then(function (oPopover) {
				oPopover.openBy(oButton);
			});
		},
		onValueHelpRequestedWp: function (oEvent) {
			var that = this;
			var oView = this.getView();
			var oCols = {
				"cols": [{
					"label": "{i18n>Posid}",
					"template": "Posid"
				}, {
					"label": "{i18n>Post1}",
					"template": "Post1"
				}, {
					"label": "{i18n>Psphi}",
					"template": "Psphi"
				}]
			};
			var omodel = new sap.ui.model.json.JSONModel(oCols);
			var aFilters = this.getWorkPackFilters();
			var aCols = oCols.cols;
			Fragment.load({
				name: "cgdc.timesheet.view.fragment.WorkPackValueHelp",
				controller: this
			}).then(function (oValueHelpDialog) {
				this._oValueHelpDialog = sap.ui.xmlfragment(oView.getId(), "cgdc.timesheet.view.fragment.WorkPackValueHelp", this);
				this.getView().addDependent(this._oValueHelpDialog);
				this._oValueHelpDialog.getTableAsync().then(function (oTable) {
					oTable.setModel(this.getView().getModel());
					oTable.setModel(omodel, "columns");
					if (oTable.bindRows) {
						oTable.bindAggregation("rows", {
							path: "/WorkPackageSet",
							filters: aFilters
						});
					}

					if (oTable.bindItems) {
						oTable.bindAggregation("items", {
							path: "/WorkPackageSet",
							filters: aFilters,
							template: function () {
								return new sap.m.ColumnListItem({
									cells: aCols.map(function (column) {
										return new sap.m.Label({
											text: "{" + column.template + "}"
										});
									})
								});
							}
						});
					}
					if (oTable.getBinding()) {
						oTable.getBinding().attachDataReceived(function (oEvent) {
							oView.setBusy(false);
						}.bind(this));
						oTable.getBinding().attachDataRequested(function (oEvent) {
							oView.setBusy(true);
						}.bind(this));
					}
					this._oValueHelpDialog.update();
				}.bind(this));
				this._oValueHelpDialog.open();
			}.bind(this));
		},
		onValueHelpRequested: function (oEvent) {
			var that = this;
			var oView = this.getView();
			var oCols = {
				"cols": [{
					"label": "{i18n>Pspnr}",
					"template": "Pspnr"
				}, {
					"label": "{i18n>Post1}",
					"template": "Post1"
				}, {
					"label": "{i18n>Pspid}",
					"template": "Pspid"
				}]
			};
			var omodel = new sap.ui.model.json.JSONModel(oCols);
			var aCols = oCols.cols;
			Fragment.load({
				name: "cgdc.timesheet.view.fragment.ProjectValueHelp",
				controller: this
			}).then(function (oValueHelpDialog) {
				this._oValueHelpDialog = sap.ui.xmlfragment(oView.getId(), "cgdc.timesheet.view.fragment.ProjectValueHelp", this);
				this.getView().addDependent(this._oValueHelpDialog);
				this._oValueHelpDialog.getTableAsync().then(function (oTable) {
					oTable.setModel(this.getView().getModel());
					oTable.setModel(omodel, "columns");
					var aSorter = new sap.ui.model.Sorter("Pspnr", false, false);
					if (oTable.bindRows) {
						oTable.bindAggregation("rows", {
							path: "/ProjectDefinitionSet",
							sorter: aSorter
						});
					}

					if (oTable.bindItems) {
						oTable.bindAggregation("items", {
							path: "/ProjectDefinitionSet",
							sorter: aSorter,
							template: function () {
								return new sap.m.ColumnListItem({
									cells: aCols.map(function (column) {
										return new sap.m.Label({
											text: "{" + column.template + "}"
										});
									})
								});
							}
						});
					}
					if (oTable.getBinding()) {
						oTable.getBinding().attachDataReceived(function (oEvent) {
							oView.setBusy(false);
						}.bind(this));
						oTable.getBinding().attachDataRequested(function (oEvent) {
							oView.setBusy(true);
						}.bind(this));
					}
					this._oValueHelpDialog.update();
				}.bind(this));
				this._oValueHelpDialog.open();
			}.bind(this));
		},
		onFilterBarClear: function (oEvent) {
			var aFilters = [];
			this._oValueHelpDialog.getFilterBar().getFilterGroupItems()[0].getControl("Pspid").setValue("");
			this._filterTable(new Filter({
				filters: aFilters,
				and: false
			}));
		},
		onFilterBarSearch: function (oEvent) {
			if (oEvent.getParameters().selectionSet) {
				var aSelectionSet = oEvent.getParameter("selectionSet");
				var aFilters = aSelectionSet.reduce(function (aResult, oControl) {
					if (oControl.getValue()) {
						aResult.push(new Filter({
							path: oControl.getName(),
							operator: FilterOperator.Contains,
							value1: oControl.getValue()
						}));
					}
					return aResult;
				}, []);
			} else {
				var aFilters = [];
				aFilters.push(new Filter({
					path: "Pspid",
					operator: FilterOperator.Contains,
					value1: oEvent.getParameters().value
				}));
			}
			this._filterTable(new Filter({
				filters: aFilters,
				and: true
			}));
		},
		_filterTable: function (oFilter) {
			var oValueHelpDialog = this._oValueHelpDialog;
			oValueHelpDialog.getTableAsync().then(function (oTable) {
				if (oTable.bindRows) {
					oTable.getBinding("rows").filter(oFilter);
				}
				if (oTable.bindItems) {
					oTable.getBinding("items").filter(oFilter);
				}
				oValueHelpDialog.update();
			});
		},
		onValueHelpBeforeOpen1: function (oEvent) {
			var that = this;
			var oTable = oEvent.getSource().getTable();
			if (oTable.getBinding()) {
				oTable.getBinding().attachDataReceived(function (oEvent) {
					this._oValueHelpDialog.getTable().setTitle(this.getResourceBundle("i18n").getText("items", [oEvent.getParameters().data.results
						.length
					]));
				}.bind(this));
			}
		},
		onValueHelpBeforeOpen: function (oEvent) {
			var that = this;
			var oCols = {
				"cols": [{
					"label": "{i18n>Pspnr}",
					"template": "Pspnr"
				}, {
					"label": "{i18n>Pspid}",
					"template": "Pspid"
				}, {
					"label": "{i18n>Post1}",
					"template": "Post1"
				}]
			};
			var omodel = new sap.ui.model.json.JSONModel(oCols);
			var aCols = oCols.cols;
			this._oValueHelpDialog = oEvent.getSource();
			this._oValueHelpDialog.getFilterBar().getFilterGroupItems()[0].getControl("Pspid").setValue("");
			this._oValueHelpDialog.getTableAsync().then(function (oTable) {
				oTable.setModel(this.getView().getModel());
				oTable.setModel(omodel, "columns");
				var aSorter = new sap.ui.model.Sorter("Pspnr", false, false);
				if (oTable.bindRows) {
					oTable.bindAggregation("rows", {
						path: "/ProjectDefinitionSet",
						sorter: aSorter
					});
				}
				if (oTable.bindItems) {
					oTable.bindAggregation("items", "/ProjectDefinitionSet", function () {
						return new sap.m.ColumnListItem({
							cells: aCols.map(function (column) {
								return new sap.m.Label({
									text: "{" + column.template + "}"
								});
							})
						});
					});
				}
				this._oValueHelpDialog.update();
			}.bind(this));
		},
		onSuggest: function (oEvent) {},
		onSuggestionItemSelected: function (oEvent) {
			this.getModel("createProject").setProperty("/key", oEvent.getParameters("selectedItem").selectedItem.getKey());
			this.getModel("createProject").setProperty("/text", oEvent.getParameters("selectedItem").selectedItem.getAdditionalText());
			this.getModel("createProject").setProperty("/pspid", oEvent.getParameters("selectedItem").selectedItem.getText());
			this.getModel("createProject").refresh();
		},
		onValueHelpOkPress1: function (oEvent) {
			this.getModel("createProject").setProperty("/key", oEvent.getParameters("newValue").newValue);
			this.getModel("createProject").refresh();
		},
		onValueHelpOkPress: function (oEvent) {
			var sPspnr = oEvent.getParameters("tokens").tokens[0].getKey();
			var sText = oEvent.getParameters("tokens").tokens[0].getText();
			this.getModel("createProject").setProperty("/key", sPspnr);
			this.getModel("createProject").setProperty("/text", sText);
			this.getModel("createProject").setProperty("/pspid", oEvent.getParameters().tokens[0].getAggregation("customData")[0].getProperty(
				"value").Pspid);
			this.getModel("createProject").refresh();
			oEvent.getSource().close();
		},
		onValueHelpCancelPress: function (oEvent) {
			oEvent.getSource().close();
		},
		onValueHelpCancelPress2: function (oEvent) {
			oEvent.getSource().close();
		},
		onLiveChangeTextAreaWp: function (oEvent) {
			var sValue = oEvent.getParameters("value").value;
			this.getModel("WorkPackData").setProperty("/message", sValue);
			this.getModel("WorkPackData").refresh();
		},
		onLiveChangeTextArea: function (oEvent) {
			var sValue = oEvent.getParameters("value").value;
			this.getModel("createProject").setProperty("/longtext", sValue);
			this.getModel("createProject").refresh();
		},
		onCreateMissingProject: function (oEvent) {
			var projectContext = this.getOwnerComponent().getModel().createEntry("/ProjectDefinitionSet", {
				properties: {
					//	"Pspnr":""
				}
			});
			var odata = {
				"key": "",
				"text": "",
				"pspid": "",
				"longtext": ""
			};
			var omodel = new JSONModel(odata);
			this.getView().setModel(omodel, "createProject");
			var that = this;
			var oView = this.getView();
			// create dialog lazily
			var oDialog;
			if (!oDialog) {
				var oDialogController = {
					handleProjectCreateOk: that.handleProjectCreateOk.bind(that),
					handleProjectCreateClose: function (oEvent) {
						oDialog.destroy();
					}.bind(that),
					onLiveChangeTextArea: that.onLiveChangeTextArea.bind(that),
					onValueHelpCancelPress2: that.onValueHelpCancelPress2.bind(that),
					onValueHelpOkPress1: that.onValueHelpOkPress1.bind(that)
				};
				// create dialog via fragment factory
				oDialog = sap.ui.xmlfragment(oView.getId(), "cgdc.timesheet.view.fragment.ProjectDialog", oDialogController);
				// connect dialog to view (models, lifecycle)
				oView.addDependent(oDialog);
			}
			jQuery.sap.syncStyleClass("sapUiSizeCompact", this.getView(), oDialog);
			oDialog.getContent()[0].getItems()[0].getContent()[1].setBindingContext(projectContext);
			jQuery.sap.delayedCall(0, this, function () {
				oDialog.open();
			});
		},
		onAddWorkPackageTimeEntries1: function (oEvent) {
			var that = this;
			this.allArray = [];
			this.sPanel = oEvent.getSource().getParent().getParent().getParent().getParent().getParent().getParent().getFlexContent().getContent()[
				1];
			var otable = oEvent.getSource().getParent().getParent().getParent();
			var iIndex = otable.indexOfRow(oEvent.getSource().getParent().getParent());
			var sPath = "/" + iIndex;
			var sPosId = oEvent.getSource().getParent().getParent().getCells()[0].getItems()[2].getText();
			var odata = oEvent.getSource().getParent().getParent().getModel("Projects").getData();
			var aRow = odata.find(function (entry, id) {
				return entry.Pspid === sPosId;
			});
			if (aRow) {
				var sProject = aRow.Pspid;
				var sPspnrChar = aRow.PspnrChar;
				this.sProjectDescr = aRow.Post1Proj;
				var sProjectDescrCombined = aRow.CombinedText;

			}
			// var sProject = oEvent.getSource().getParent().getParent().getModel("Projects").getObject(sPath).Pspid;
			// var sPspnrChar = oEvent.getSource().getParent().getParent().getModel("Projects").getObject(sPath).PspnrChar;
			// this.sProjectDescr = oEvent.getSource().getParent().getParent().getModel("Projects").getObject(sPath).Post1Proj;
			// var sProjectDescrCombined = oEvent.getSource().getParent().getParent().getModel("Projects").getObject(sPath).CombinedText;
			var odata = {
				"Pspid": sProject,
				"PspnrChar": sPspnrChar,
				"Post1Proj": sProjectDescrCombined,
				"workpack": "",
				"message": ""
			};
			var omodel = new JSONModel(odata);
			this.getView().setModel(omodel, "WorkPackData");
			var f = [];
			var c = new sap.ui.model.Filter({
				path: "WorkListDataFields/Pspid",
				operator: sap.ui.model.FilterOperator.EQ,
				value1: sProject
			});
			f.push(c);
			//get work packages from worklist model
			var oWorkListModel = this.getModel("Worklist");
			var aWorkListData = oWorkListModel.getData();
			var aRows = aWorkListData.filter(function (entry, id) {
				return entry.WorkListDataFields.Pspid === sProject;
			});
			if (aRows.length) {
				for (var i = 0; i < aRows.length; i++) {
					aRows[i].WorkListDataFields.selected = false;
				}
				var omodel1 = new JSONModel(aRows);
				that.getView().setModel(omodel1, "WorkPackList");
				var oView = this.getView();
				// create dialog lazily
				var oDialog;
				if (!oDialog) {
					var oDialogController = {
						handleWorkProjectDispOk: that.handleWorkProjectDispOk.bind(that),
						onRequestMissingWP: that.onRequestMissingWP.bind(that),
						onBeforeOpenWPDisplay: that.onBeforeOpenWPDisplay.bind(that),
						onWorkPackSelectionChange: that.onWorkPackSelectionChange.bind(that),
						handleWorkProjectDispCancel: function (oEvent) {
							that.allArray = [];
							oDialog.destroy();
						}
					};
					// create dialog via fragment factory
					oDialog = sap.ui.xmlfragment(oView.getId(), "cgdc.timesheet.view.fragment.WorkPackDisplay", oDialogController);
					// connect dialog to view (models, lifecycle)
					oView.addDependent(oDialog);
				}
				jQuery.sap.syncStyleClass("sapUiSizeCompact", this.getView(), oDialog);
				jQuery.sap.delayedCall(0, this, function () {
					oDialog.open();
				});
			}
		},
		onWorkPackSelectionChange: function (oEvent) {
			var object = {
				"posid": oEvent.getParameters().listItem.getDescription(),
				"selected": oEvent.getParameters().listItem.getSelected()
			};
			if (this.allArray.length) {
				var aRow = this.allArray.find(function (entry, id) {
					return entry.posid === object.posid;
				});
				if (aRow) {
					aRow.selected = object.selected;
				} else {
					this.allArray.push(object);
				}
			} else {
				this.allArray.push(object);
			}
		},
		onBeforeOpenWPDisplay: function (oEvent) {
			oEvent.getSource().getContent()[0].getItems()[1].setHeaderText(this.sProjectDescr);
			var oItems = this.entryListContents.getItems();
			if (oItems.length) {
				var aWpFromModelData = this.getModel("WorkPackList").getData();
				for (var j = 0; j < aWpFromModelData.length; j++) {
					for (var i = 0; i < oItems.length; i++) {
						var sTitle = oItems[i].getCells()[1].getText();
						if (sTitle === aWpFromModelData[j].WorkListDataFields.POSID) {
							aWpFromModelData[j].WorkListDataFields.selected = true;
							break;
						}
					}
				}
				this.getModel("WorkPackList").refresh();
			}
		},
		onAddWorkPackageTimeEntries: function (oEvent) {
			var sPath = oEvent.getSource().getParent().getItems()[0].getParent().getParent().getBindingContextPath();
			var sPosId = this.getModel("Worklist").getObject(sPath).WorkListDataFields.POSID; //get object from model
			var sPost1 = this.getModel("Worklist").getObject(sPath).WorkListDataFields.ZPOSIDTEXT;
			var odata = {
				"posid": sPosId,
				"post1": sPost1,
				"workpack": "",
				"message": ""
			};
			var omodel = new JSONModel(odata);
			this.getView().setModel(omodel, "WorkPackData");
			var that = this;
			var oView = this.getView();
			// create dialog lazily
			var oDialog;
			if (!oDialog) {
				var oDialogController = {
					handleWorkProjectDispOk: that.handleWorkProjectDispOk.bind(that),
					onRequestMissingWP: that.onRequestMissingWP.bind(that),
					onBeforeOpenWPDisplay: that.onBeforeOpenWPDisplay.bind(that)
				};
				// create dialog via fragment factory
				oDialog = sap.ui.xmlfragment(oView.getId(), "cgdc.timesheet.view.fragment.WorkPackDisplay", oDialogController);
				// connect dialog to view (models, lifecycle)
				oView.addDependent(oDialog);
			}
			jQuery.sap.syncStyleClass("sapUiSizeCompact", this.getView(), oDialog);

			jQuery.sap.delayedCall(0, this, function () {
				oDialog.open();
			});
		},
		onRequestMissingWP: function (oEent) {
			var that = this;
			var sProjectId = this.getModel("WorkPackData").getProperty("/PspnrChar");
			var oStartDate = this.mCalendar.getStartDate();
			var oEndDate = this.getLastDayOfWeek(oStartDate, 1);
			var projectContext = this.getOwnerComponent().getModel().createEntry("/WorkPackageSet", {
				properties: {
					"Psphi": sProjectId,
					"Usr08": oStartDate,
					"Usr09": oEndDate
				}
			});
			var oView = this.getView();
			// create dialog lazily
			var oDialog;
			if (!oDialog) {
				var oDialogController = {
					handleWorkProjectReqCancel: function (oEvent) {
						oDialog.destroy();
					},
					handleWorkProjectReqOk: that.handleWorkProjectReqOk.bind(that),
					onValueHelpOkPressWp: that.onValueHelpOkPressWp.bind(that)
				};
				// create dialog via fragment factory
				oDialog = sap.ui.xmlfragment(oView.getId(), "cgdc.timesheet.view.fragment.WorkPackRequest", oDialogController);
				// connect dialog to view (models, lifecycle)
				oView.addDependent(oDialog);
			}
			jQuery.sap.syncStyleClass("sapUiSizeCompact", this.getView(), oDialog);
			oDialog.getContent()[0].getItems()[0].getContent()[3].setBindingContext(projectContext);
			jQuery.sap.delayedCall(0, this, function () {
				oDialog.open();
			});
		},
		onAfterOpenWorkPackMissing: function (oEvent) {
			var aFilters = this.getWorkPackFilters();
			var oBindings = oEvent.getSource().getContent()[0].getItems()[0].getContent()[3].getBinding("suggestionItems");
			oEvent.getSource().getContent()[0].getItems()[0].getContent()[3].setShowSuggestion(true);
			var oTemplate = new sap.ui.core.ListItem({
				text: "{Posid}",
				key: "{Objnr}",
				additionalText: "{Post1}"
			});
			oEvent.getSource().getContent()[0].getItems()[0].getContent()[3].bindAggregation("suggestionItems", {
				path: "/WorkPackageSet",
				template: oTemplate,
				filters: aFilters
			});
		},
		onValueHelpOkPressWp: function (oEvent) {
			this.getModel("WorkPackData").setProperty("/workpack", oEvent.getParameters("newValue").newValue);
		},
		handleWorkProjectReqOk: function (oEvent) {
			var odata = this.getModel("WorkPackData").getData();
			sap.m.MessageToast.show("Backend Development in progress");
			oEvent.getSource().getParent().close();
		},
		handleWorkProjectDispOk: function (oEvent) {
			var aRowsFalse = this.allArray.filter(function (entry, id) {
				return entry.selected === false;
			});
			var aRowsTrue = this.allArray.filter(function (entry, id) {
				return entry.selected === true;
			});
			var data = this.getModel("TimeData").getData();
			var oItems = this.entryListContents.getItems();
			if (aRowsFalse.length) {
				for (var j = 0; j < aRowsFalse.length; j++) {
					for (var i = 0; i < oItems.length; i++) {
						var sTitle = oItems[i].getCells()[1].getText();
						if (sTitle === aRowsFalse[j].posid) {
							//TO DO when approved entry found from backend records
							var aTableRows = this.getModel("aTableRows").getData();
							if (aTableRows.length) {
								var record = aTableRows.find(function (entry, id) {
									return entry.posid === sTitle;
								});
								if (record.overallWeekStatus === true) {
									MessageBox.information(this.getResourceBundle().getText("approvedEntries"));
									return;
								} else {
									for (var l = 0; l < data.length; l++) {
										if (data[l].TimeEntryDataFields.POSID === aRowsFalse[j].posid) {
											data[l].TimeEntryOperation = "D";
										}
									}
									this.getModel("TimeData").refresh(true);
									this.projectTable.removeItem(oItems[i]);
									this.getModel("controls").setProperty("/isDataChanged", true);
								}
							} else {
								var filteredRecords = data.filter(function (entry, id) {
									return entry.TimeEntryDataFields.POSID !== sTitle;
								});
								this.getModel("TimeData").setData(filteredRecords);
								this.projectTable.removeItem(oItems[i]);
								this.getModel("controls").setProperty("/isDataChanged", true);
								sap.m.MessageToast.show(this.getResourceBundle().getText("removed"));
								break;
							}
							//end of TO DO
						}
					}
				}
			}
			if (aRowsTrue.length) {
				this.selKeys = $.extend(true, [], aRowsTrue);
				this.handleSelectWbsOk();
			}
			oEvent.getSource().getParent().close();
		},
		handleProjectCreateOk: function (oEvent) {
			var that = this;
			if (this.getModel("createProject").getProperty("/key") !== "") {
				oEvent.getSource().getParent().close();
				var payload = {
					"Pspnr": this.getModel("createProject").getProperty("/key"),
					"Post1": "",
					"Pspid": "",
				};
				// this.oDataModel.create("/ProjectDefinitionSet", payload, {
				// 	success: function (odata) {
				// 		that.busyDialog.close();
				// 		var toastMsg = that.getResourceBundle().getText("projectSuccess");
				// 		sap.m.MessageToast.show(toastMsg, {});
				// 	},
				// 	error: function (oError) {
				// 		that.busyDialog.close();
				// 		that.oErrorHandler.processError(oError);
				// 	}
				// });
				sap.m.MessageToast.show("This feature currently under development");
			} else {
				sap.m.MessageToast.show(that.getResourceBundle().getText("selprojectid"));
			}
		},
		onChangeProjectName: function (oEvent) {},

		// mobile events:
		onEdit: function () {
			var oModel = this.getModel('controls');
			oModel.setProperty('/showFooter', true);
			oModel.setProperty('/sendForApproval', true);
			oModel.setProperty('/submitDraft', this.profileInfo.AllowRelease === "TRUE" ? false : true);
			oModel.setProperty('/overviewCancel', true);
			oModel.setProperty('/todoCancel', false);
			oModel.setProperty('/duplicateVisibility', true);
			if (sap.ui.Device.system.phone === false) {
				oModel.setProperty('/duplicateWeekVisibility', true);
			}
			oModel.setProperty('/overviewEdit', false);
			oModel.setProperty('/todoDone', false);
			// oModel.setProperty('/onEdit', "MultiSelect");
			oModel.setProperty('/onEdit', "None");
			oModel.setProperty('/duplicateTaskEnable', false);

			this.readTemplate = new sap.m.ColumnListItem({
				cells: [
					new sap.m.Text({
						text: "{path: 'TimeData>TimeEntryDataFields/WORKDATE', type: 'sap.ui.model.type.Date', formatOptions: { pattern: 'EEEE, MMMM d' }}"
					}),
					new sap.m.ObjectIdentifier({
						text: "{TimeData>TimeEntryDataFields/AWART}"
					}),
					new sap.m.ObjectStatus({
						text: {
							path: 'TimeData>TimeEntryDataFields/STATUS',
							formatter: formatter.status
						},
						state: {
							path: 'TimeData>TimeEntryDataFields/STATUS',
							formatter: formatter.state
						}
					}),
					new sap.m.ObjectStatus({
						icon: "sap-icon://notes",
						visible: {
							parts: [{
								path: 'TimeData>TimeEntryDataFields/LONGTEXT'
							}, {
								path: 'TimeData>RejReasondesc'
							}],
							formatter: formatter.visibility
						}
					})
				]
			});
			this.getView().byId("idOverviewTable").removeItem(0);
			this.oEditableTemplate = new sap.m.ColumnListItem({
				highlight: "{TimeData>highlight}",
				cells: [
					new sap.m.ObjectStatus({
						text: {
							parts: [{
								path: 'TimeData>totalHours',
								type: 'sap.ui.model.odata.type.Decimal',
								formatOptions: {
									parseAsString: true,
									decimals: 2,
									maxFractionDigits: 2,
									minFractionDigits: 0
								},
								constraints: {
									precision: 4,
									scale: 2,
									minimum: '0',
									maximum: '10000'
								}
							}, {
								path: 'TimeData>target',
								type: 'sap.ui.model.odata.type.Decimal',
								formatOptions: {
									parseAsString: true,
									decimals: 2,
									maxFractionDigits: 2,
									minFractionDigits: 0
								},
								constraints: {
									precision: 4,
									scale: 2,
									minimum: '0',
									maximum: '10000'
								}
							}],
							formatter: formatter.concatStrings
						},
						visible: true
					}),
					new sap.m.ComboBox({
						selectedKey: "{:=${TimeData>AssignmentId}}",
						selectionChange: this.onSelectionChangeWorkListPhone.bind(this),
						enabled: {
							path: 'TimeData>Status',
							formatter: this.formatter.checkHrRecord.bind(this)
						},
						showSecondaryValues: true
					}).bindItems({
						path: "Worklist>/",
						template: new sap.ui.core.ListItem({
							key: "{Worklist>WorkListDataFields/POSID}",
							text: "{Worklist>WorkListDataFields/Post1}"
						}),
						templateShareable: true
					}),
					new sap.ui.layout.HorizontalLayout({
						content: [
							new sap.m.StepInput({
								value: {
									parts: [{
										path: 'TimeData>TimeEntryDataFields/CATSHOURS'
									}, {
										path: 'TimeData>TimeEntryDataFields/CATSQUANTITY'
									}, {
										path: 'TimeData>TimeEntryDataFields/CATSAMOUNT'
									}],
									formatter: formatter.calHoursQuanAmountInput.bind(this)
								},
								description: {
									parts: [{
										path: 'TimeData>TimeEntryDataFields/UNIT'
									}, {
										path: 'TimeData>TimeEntryDataFields/CATSHOURS'
									}],
									formatter: formatter.getUnitTexts.bind(this)
								},
								change: this.liveChangeHours.bind(this),
								displayValuePrecision: 2,
								step: 1,
								min: 0,
								fieldWidth: "60%",
								valueState: "{TimeData>valueState}",
								valueStateText: "{TimeData>valueStateText}",
								enabled: {
									parts: [{
										path: 'TimeData>Status'
									}, {
										path: 'controls>/hoursDisabled'
									}],
									formatter: this.formatter.checkHrRecord.bind(this)
								}
							})
						]
					}),
					new sap.m.CheckBox({
						selected: "{TimeData>SetDraft}",
						visible: this.draftStatus,
						enabled: {
							path: 'TimeData>Status',
							formatter: this.formatter.checkHrRecord.bind(this)
						}
					}).attachSelect(this.onSelectionDraft.bind(this)),
					new sap.m.TimePicker({
						value: {
							path: 'TimeData>TimeEntryDataFields/BEGUZ',
							formatter: this.formatter.formatTime.bind(this)
						},
						visible: this.clockTimeVisible,
						valueFormat: "HH:mm",
						displayFormat: "HH:mm",
						change: this.startTimeChange.bind(this),
						placeholder: this.oBundle.getText("startTime"),
						enabled: {
							path: 'TimeData>Status',
							formatter: this.formatter.checkHrRecord.bind(this)
						}
					}),
					new sap.m.TimePicker({
						value: {
							path: 'TimeData>TimeEntryDataFields/ENDUZ',
							formatter: this.formatter.formatTime.bind(this)
						},
						visible: this.clockTimeVisible,
						valueFormat: "HH:mm",
						displayFormat: "HH:mm",
						change: this.endTimeChange.bind(this),
						placeholder: this.oBundle.getText("endTime"),
						enabled: {
							path: 'TimeData>Status',
							formatter: this.formatter.checkHrRecord.bind(this)
						}
					}),
					new sap.m.ObjectStatus({
						text: {
							path: 'TimeData>TimeEntryDataFields/STATUS',
							formatter: formatter.status
						},
						state: {
							path: 'TimeData>TimeEntryDataFields/STATUS',
							formatter: formatter.state
						}
					}),
					new sap.m.Button({
						icon: {
							path: 'TimeData>TimeEntryDataFields/LONGTEXT',
							formatter: formatter.longtextButtons
						},
						type: sap.m.ButtonType.Transparent,
						press: this.longtextPopover.bind(this),
						enabled: {
							path: 'TimeData>Status',
							formatter: this.formatter.checkHrRecord.bind(this)
						}
					}),
					new sap.ui.layout.HorizontalLayout({
						content: [new sap.m.Button({
								icon: "sap-icon://sys-cancel",
								type: sap.m.ButtonType.Transparent,
								press: this.onOverviewDeleteRow.bind(this),
								visible: "{TimeData>deleteButton}",
								enabled: "{TimeData>deleteButtonEnable}"
							}),
							new sap.m.Button({
								icon: "sap-icon://add",
								type: sap.m.ButtonType.Transparent,
								press: this.onOverviewAddRow.bind(this),
								visible: "{TimeData>addButton}",
								enabled: "{TimeData>addButtonEnable}"
							})
						],
						visible: {
							path: 'TimeData>Status',
							formatter: this.formatter.checkHrRecord.bind(this)
						}
					})

				],
				customData: [new sap.ui.core.CustomData({
					key: "counter",
					value: "{TimeData>Counter}"
				})]
			});
			this.rebindTableWithTemplate(this.oTable, "TimeData>/", this.oEditableTemplate, "Edit");
		},
		onSelectionChangeWorkListPhone: function (oEvent) {
			var selectedKey = oEvent.getParameter('selectedItem').getKey();
			var selectedText = oEvent.getParameter('selectedItem').getText();
			var oModel = this.getModel('TimeData');
			var data = oModel.getData();
			var index = parseInt(oEvent.getSource().getParent().getBindingContext('TimeData').getPath().split('/')[1]);
			var oWorkListModel = oEvent.getParameter('selectedItem').getModel("Worklist");
			var aWorkListData = oWorkListModel.getData();
			var aRow = aWorkListData.find(function (entry, id) {
				return entry.WorkListDataFields.POSID === selectedKey;
			});
			var workdate = new Date(data[index].TimeEntryDataFields.WORKDATE);
			var hours = data[index].TimeEntryDataFields.CATSHOURS;
			var status = data[index].TimeEntryDataFields.STATUS;
			var startTime = data[index].TimeEntryDataFields.BEGUZ;
			var endTime = data[index].TimeEntryDataFields.ENDUZ;
			data[index].TimeEntryDataFields.WORKDATE = workdate;
			data[index].TimeEntryDataFields.CATSHOURS = hours;
			data[index].TimeEntryDataFields.STATUS = status;
			data[index].TimeEntryDataFields.BEGUZ = startTime;
			data[index].TimeEntryDataFields.ENDUZ = endTime;
			data[index].TimeEntryDataFields.AWART = "WRK";
			data[index].TimeEntryDataFields.LSTNR = aRow.WorkListDataFields.LSTNR;
			data[index].TimeEntryDataFields.LTXA1 = aRow.WorkListDataFields.LTXA1;
			data[index].TimeEntryDataFields.POSID = aRow.WorkListDataFields.POSID;
			data[index].TimeEntryDataFields.RPROJ = aRow.WorkListDataFields.RPROJ;
			data[index].TimeEntryDataFields.TASKCOMPONENT = aRow.WorkListDataFields.TASKCOMPONENT;
			data[index].TimeEntryDataFields.TASKLEVEL = aRow.WorkListDataFields.Catstasklevel;
			data[index].TimeEntryDataFields.TASKTYPE = aRow.WorkListDataFields.TASKTYPE;
			data[index].TimeEntryDataFields.LSTAR = aRow.WorkListDataFields.LSTAR; //Activity type
			data[index].AssignmentId = aRow.WorkListDataFields.POSID;
			data[index].AssignmentName = aRow.WorkListDataFields.Post1;
			if (data[index].Counter && data[index].Counter !== null && data[index].Counter !== "") {
				data[index].TimeEntryOperation = 'U';
				data[index].deleteButtonEnable = true;
				data[index].addButtonEnable = true;
			} else {
				data[index].TimeEntryOperation = 'C';
				data[index].Counter = "";
				data[index].deleteButtonEnable = true;
				data[index].addButtonEnable = true;
			}
			data[index].highlight = sap.ui.core.MessageType.Information;
			data[index].HeaderData.highlight = sap.ui.core.MessageType.Information;
			data[index].HeaderData.addButton = true;
			var item = $.grep(this.oTable.getItems(), function (element, index) {
				if (!element.getAggregation('cells')) {
					return false;
				} else {
					return true;
				}
			});
			this.getModel("controls").setProperty("/isOverviewChanged", true);
			this.getModel("controls").setProperty("/overviewDataChanged", true);
			item[index].focus();
		},
		endTimeChange: function (oEvent) {
			var that = this;
			var data = this.getModel("TimeData").getData();
			var oControl = this.getModel("controls");
			var index = oEvent.getSource().getParent().getBindingContext('TimeData').getPath().split('/')[1];
			data[index].TimeEntryDataFields.ENDUZ = that.formatter.convertTime(oEvent.getSource().getDateValue());
			if (data[index].Counter !== "") {
				data[index].TimeEntryOperation = 'U';
			} else {
				data[index].TimeEntryOperation = 'C';
			}
			var oModel = new JSONModel(data);
			that.setModel(oModel, "TimeData");
			this.getModel("controls").setProperty("/isOverviewChanged", true);
			this.getModel("controls").setProperty("/overviewDataChanged", true);
			var item = $.grep(this.oTable.getItems(), function (element, index) {
				if (!element.getAggregation('cells')) {
					return false;
				} else {
					return true;
				}
			});
			item[index].focus();
		},
		startTimeChange: function (oEvent) {
			var that = this;
			var data = this.getModel("TimeData").getData();
			var index = oEvent.getSource().getParent().getBindingContext('TimeData').getPath().split('/')[1];
			data[index].TimeEntryDataFields.BEGUZ = that.formatter.convertTime(oEvent.getSource().getDateValue());
			if (data[index].Counter !== "") {
				data[index].TimeEntryOperation = 'U';
			} else {
				data[index].TimeEntryOperation = 'C';
			}
			var oModel = new JSONModel(data);
			that.setModel(oModel, "TimeData");
			this.getModel("controls").setProperty("/isOverviewChanged", true);
			this.getModel("controls").setProperty("/overviewDataChanged", true);
			var item = $.grep(this.oTable.getItems(), function (element, index) {
				if (!element.getAggregation('cells')) {
					return false;
				} else {
					return true;
				}
			});
			item[index].focus();
		},
		onSelectionDraft: function (oEvent) {
			var that = this;
			var oModel = this.oTable.getModel('TimeData');
			var index = parseInt(oEvent.getSource().getParent().getBindingContext('TimeData').getPath().split('/')[1]);
			var data = oModel.getData();
			var counter = oEvent.getSource().getParent().getCustomData('counter')[0].getValue();
			if (counter && counter !== null) {
				data[index].TimeEntryOperation = 'U';
			} else {
				data[index].TimeEntryOperation = 'C';
			}
			this.getModel("controls").setProperty("/isOverviewChanged", true);
			this.getModel("controls").setProperty("/overviewDataChanged", true);
		},
		onOverviewAddRow: function (oEvent) {
			this.oTable.setBusy(true);
			var newRecord = this.recordTemplate();
			var oControls = this.getModel("controls");
			var counter = oEvent.getSource().getParent().getParent().getCustomData('counter')[0].getValue();
			var oModel = this.getModel('TimeData');
			var index = parseInt(oEvent.getSource().getParent().getBindingContext('TimeData').getPath().split('/')[1]);
			var data = oModel.getData();
			data[index].addButton = false;
			var insert = $.extend(true, {}, newRecord);
			insert.totalHours = data[index].totalHours;
			insert.TimeEntryDataFields.WORKDATE = new Date(data[index].TimeEntryDataFields.WORKDATE);
			insert.target = data[index].target;
			insert.HeaderData = $.extend(true, {}, data[index].HeaderData);
			data[index].HeaderData.addButton = false;
			insert.highlight = sap.ui.core.MessageType.Information;
			insert.HeaderData.highlight = true;
			insert.HeaderData.addButton = true;
			insert.addButton = true;
			data.splice(index + 1, 0, insert);
			oModel.setData(data);
			this.setModel(oModel, 'TimeData');
			this.getModel("controls").setProperty("/isOverviewChanged", true);
			this.getModel("controls").setProperty("/overviewDataChanged", true);
			var item = $.grep(this.oTable.getItems(), function (element, index) {
				if (!element.getAggregation('cells')) {
					return false;
				} else {
					return true;
				}
			});
			item[index + 1].focus();
			this.oTable.setBusy(false);
		},
		onOverviewDeleteRow: function (oEvent) {
			var that = this;
			this.oTable.setBusy(true);
			var counter = oEvent.getSource().getParent().getParent().getCustomData('counter')[0].getValue();
			var oModel = this.getModel('TimeData');
			var data = oModel.getData();
			this.setModel(oModel, 'OriginalTime');
			var index = parseInt(oEvent.getSource().getParent().getBindingContext('TimeData').getPath().split('/')[1]);
			var deleteRow = $.extend(true, {}, data[index]);
			var delModel = this.getModel('deleteRecords');
			var deleteArray = this.getModel('deleteRecords').getData();
			var recordTemplate = this.recordTemplate();
			if (data[index].Counter && data[index].Counter != null) {
				if (deleteArray.length) {
					deleteArray.push(deleteRow);
					delModel.setData(deleteArray);
				} else {
					delModel.setData([deleteRow]);
				}
				this.setModel(delModel, 'deleteRecords');
			}
			var otherRecords = $.grep(data, function (element, ind) {
				return that.oFormatyyyymmdd.format(new Date(element.TimeEntryDataFields.WORKDATE)) === that.oFormatyyyymmdd.format(new Date(
					data[index].TimeEntryDataFields.WORKDATE)) && element.Status !== '99';
			});
			var date = that.oFormatyyyymmdd.format(new Date(data[index].TimeEntryDataFields.WORKDATE));
			if (otherRecords.length >= 2) {
				data.splice(index, 1);
				var otherRecords = $.grep(data, function (element, ind) {
					return that.oFormatyyyymmdd.format(new Date(element.TimeEntryDataFields.WORKDATE)) === date && element.Status !== '99';
				});
				otherRecords[otherRecords.length - 1].addButtonEnable = true;
				otherRecords[otherRecords.length - 1].addButton = true;
				otherRecords[otherRecords.length - 1].HeaderData.addButton = true;
				data = this.calculateSum(new Date(otherRecords[otherRecords.length - 1].TimeEntryDataFields.WORKDATE), data);
				oModel.setData(data);
				this.setModel(oModel, 'TimeData');
			} else {
				var recordTemplate = this.recordTemplate();
				data[index].AssignmentId = "";
				data[index].AssignmentName = "";
				data[index].addButton = true;
				data[index].deleteButtonEnable = false;
				data[index].addButtonEnable = false;
				data[index].SetDraft = false;
				data[index].HeaderData.addButton = true;
				data[index].Counter = "";
				Object.getOwnPropertyNames(data[index].TimeEntryDataFields).forEach(function (prop) {
					if (prop == "WORKDATE") {} else {
						data[index].TimeEntryDataFields[prop] = recordTemplate.TimeEntryDataFields[prop];
					}
				});
				data = this.calculateSum(new Date(data[index].TimeEntryDataFields.WORKDATE), data);
				oModel.setData(data);
				this.setModel(oModel, 'TimeData');
			}
			this.getModel("controls").setProperty("/isOverviewChanged", true);
			this.getModel("controls").setProperty("/overviewDataChanged", true);
			this.oTable.setBusy(false);
			var item = $.grep(this.oTable.getItems(), function (element, index) {
				if (!element.getAggregation('cells')) {
					return false;
				} else {
					return true;
				}
			});
			item[index].focus();
		},
		liveChangeHours: function (oEvent) {
			var val = /^\d+(\.\d{1,2})?$/;
			this.getModel("controls").setProperty("/isOverviewChanged", true);
			this.getModel("controls").setProperty("/overviewDataChanged", true);
			if (val.test(oEvent.getSource().getValue())) {
				var counter = oEvent.getSource().getParent().getParent().getCustomData('counter')[0].getValue();
				var oModel = this.oTable.getModel('TimeData');
				var index = parseInt(oEvent.getSource().getParent().getParent().getBindingContext('TimeData').getPath().split('/')[1]);
				var data = oModel.getData();
				if (counter) {
					data[index].TimeEntryOperation = 'U';
					data[index].TimeEntryDataFields.CATSHOURS = parseFloat(oEvent.getSource().getValue()).toFixed(2);
				} else {
					data[index].TimeEntryOperation = 'C';
					data[index].TimeEntryDataFields.CATSHOURS = parseFloat(oEvent.getSource().getValue()).toFixed(2);
				}
				data = this.calculateSum(new Date(data[index].TimeEntryDataFields.WORKDATE), data);
				this.setModel(new JSONModel(data), 'TimeData');
				var item = $.grep(this.oTable.getItems(), function (element, index) {
					if (!element.getAggregation('cells')) {
						return false;
					} else {
						return true;
					}
				});
				item[index].focus();

			}

		},
		readOnlyTemplateAdmin: function () {
			var that = this;
			this.oReadOnlyTemplateAdmin = new sap.m.ColumnListItem({
				cells: [
					new sap.m.ObjectStatus({
						text: {
							parts: [{
								path: 'TimeDataAdmin>totalHours',
								type: 'sap.ui.model.odata.type.Decimal',
								formatOptions: {
									parseAsString: true,
									decimals: 2,
									maxFractionDigits: 2,
									minFractionDigits: 0
								},
								constraints: {
									precision: 4,
									scale: 2,
									minimum: '0',
									maximum: '10000'
								}
							}, {
								path: 'TimeDataAdmin>target',
								type: 'sap.ui.model.odata.type.Decimal',
								formatOptions: {
									parseAsString: true,
									decimals: 2,
									maxFractionDigits: 2,
									minFractionDigits: 0
								},
								constraints: {
									precision: 4,
									scale: 2,
									minimum: '0',
									maximum: '10000'
								}
							}],
							formatter: formatter.concatStrings
						},
						visible: sap.ui.Device.system.phone ? true : false
					}),
					new sap.m.Link({
						text: {
							parts: [{
								path: 'TimeDataAdmin>AssignmentName'
							}, {
								path: 'TimeDataAdmin>AssignmentId'
							}, {
								path: 'TimeDataAdmin>Counter'
							}],
							formatter: this.formatter.assignmentName.bind(this)
						},
					}),
					new sap.m.ObjectNumber({
						number: {
							parts: [{
								path: 'TimeDataAdmin>TimeEntryDataFields/CATSHOURS'
							}, {
								path: 'TimeDataAdmin>TimeEntryDataFields/CATSQUANTITY'
							}, {
								path: 'TimeDataAdmin>TimeEntryDataFields/CATSAMOUNT'
							}],
							formatter: formatter.calHoursQuanAmount.bind(this)
						},
						unit: {
							parts: [{
								path: 'TimeDataAdmin>TimeEntryDataFields/UNIT'
							}, {
								path: 'TimeDataAdmin>TimeEntryDataFields/CATSHOURS'
							}],
							formatter: formatter.getUnitTexts.bind(this)
						}
					}),
					new sap.m.CheckBox({
						editable: false,
						visible: this.draftStatus,
						selected: "{TimeDataAdmin>SetDraft}"
					}),
					new sap.m.ObjectIdentifier({
						text: {
							path: 'TimeDataAdmin>TimeEntryDataFields/BEGUZ',
							formatter: this.formatter.formatTime.bind(this)
						},
						visible: this.clockTimeVisible
					}),
					new sap.m.ObjectIdentifier({
						text: {
							path: 'TimeDataAdmin>TimeEntryDataFields/ENDUZ',
							formatter: this.formatter.formatTime.bind(this)
						},
						visible: this.clockTimeVisible
					}),
					new sap.m.ObjectStatus({
						text: {
							path: 'TimeDataAdmin>TimeEntryDataFields/STATUS',
							formatter: formatter.status
						},
						state: {
							path: 'TimeDataAdmin>TimeEntryDataFields/STATUS',
							formatter: formatter.state
						}
					}),
					new sap.m.Button({
						icon: "sap-icon://notification-2",
						type: sap.m.ButtonType.Transparent,
						//	press: this.displaylongtextPopover.bind(this),
						visible: {
							path: 'TimeDataAdmin>TimeEntryDataFields/LONGTEXT',
							formatter: formatter.visibility
						}
					})

				],
				customData: [new sap.ui.core.CustomData({
					key: "counterAdmin",
					value: "{TimeDataAdmin>Counter}"
				})]
			});
			this.oTableAdmin.bindItems({
				path: 'TimeDataAdmin>/',
				sorter: new sap.ui.model.Sorter("TimeEntryDataFields/WORKDATE", false, true),
				template: this.oReadOnlyTemplateAdmin,
				templateShareable: true,
				groupHeaderFactory: this.getGroupHeader.bind(this)
			});
		},
		readOnlyTemplate: function () {
			var that = this;
			this.oReadOnlyTemplate = new sap.m.ColumnListItem({
				cells: [
					new sap.m.ObjectStatus({
						text: {
							parts: [{
								path: 'TimeData>totalHours',
								type: 'sap.ui.model.odata.type.Decimal',
								formatOptions: {
									parseAsString: true,
									decimals: 2,
									maxFractionDigits: 2,
									minFractionDigits: 0
								},
								constraints: {
									precision: 4,
									scale: 2,
									minimum: '0',
									maximum: '10000'
								}
							}, {
								path: 'TimeData>target',
								type: 'sap.ui.model.odata.type.Decimal',
								formatOptions: {
									parseAsString: true,
									decimals: 2,
									maxFractionDigits: 2,
									minFractionDigits: 0
								},
								constraints: {
									precision: 4,
									scale: 2,
									minimum: '0',
									maximum: '10000'
								}
							}],
							formatter: formatter.concatStrings
						},
						visible: sap.ui.Device.system.phone ? true : false
					}),
					new sap.m.Link({
						text: {
							parts: [{
								path: 'TimeData>AssignmentName'
							}, {
								path: 'TimeData>AssignmentId'
							}, {
								path: 'TimeData>Counter'
							}],
							formatter: this.formatter.assignmentName.bind(this)
						},
						press: this.onAssignmentQuickView.bind(this)
					}),
					new sap.m.ObjectNumber({
						number: {
							parts: [{
								path: 'TimeData>TimeEntryDataFields/CATSHOURS'
							}, {
								path: 'TimeData>TimeEntryDataFields/CATSQUANTITY'
							}, {
								path: 'TimeData>TimeEntryDataFields/CATSAMOUNT'
							}],
							formatter: formatter.calHoursQuanAmount.bind(this)
						},
						unit: {
							parts: [{
								path: 'TimeData>TimeEntryDataFields/UNIT'
							}, {
								path: 'TimeData>TimeEntryDataFields/CATSHOURS'
							}],
							formatter: formatter.getUnitTexts.bind(this)
						}
					}),
					new sap.m.CheckBox({
						editable: false,
						visible: this.draftStatus,
						selected: "{TimeData>SetDraft}"
					}),
					new sap.m.ObjectIdentifier({
						text: {
							path: 'TimeData>TimeEntryDataFields/BEGUZ',
							formatter: this.formatter.formatTime.bind(this)
						},
						visible: this.clockTimeVisible
					}),
					new sap.m.ObjectIdentifier({
						text: {
							path: 'TimeData>TimeEntryDataFields/ENDUZ',
							formatter: this.formatter.formatTime.bind(this)
						},
						visible: this.clockTimeVisible
					}),
					new sap.m.ObjectStatus({
						text: {
							path: 'TimeData>TimeEntryDataFields/STATUS',
							formatter: formatter.status
						},
						state: {
							path: 'TimeData>TimeEntryDataFields/STATUS',
							formatter: formatter.state
						}
					}),
					new sap.m.Button({
						icon: "sap-icon://notification-2",
						type: sap.m.ButtonType.Transparent,
						press: this.displaylongtextPopover.bind(this),
						visible: {
							path: 'TimeData>TimeEntryDataFields/LONGTEXT',
							formatter: formatter.visibility
						}
					})

				],
				customData: [new sap.ui.core.CustomData({
					key: "counter",
					value: "{TimeData>Counter}"
				})]
			});
			this.oTable.bindItems({
				path: 'TimeData>/',
				sorter: new sap.ui.model.Sorter("TimeEntryDataFields/WORKDATE", false, true),
				template: this.oReadOnlyTemplate,
				templateShareable: true,
				groupHeaderFactory: this.getGroupHeader.bind(this)
			});
		},
		onAssignmentQuickView: function (oEvent) {
			var index = oEvent.getSource().getParent().getBindingContext('TimeData').getPath().split('/')[1];
			var timeData = this.getModel('TimeData').getData();
			var profileData = this.getModel('ProfileFields').getData();
			var sPosid = timeData[index].TimeEntryDataFields.POSID;
			if (sPosid) {
				var oWorkListModel = this.getModel("Worklist");
				var aWorkListData = oWorkListModel.getData();
				var aRow = aWorkListData.find(function (entry, id) {
					return entry.WorkListDataFields.POSID === sPosid;
				});
				if (aRow) {
					var data = [{
						label: this.oBundle.getText("name"),
						value: timeData[index].AssignmentName
					}];
					var item;
					var element = {
						label: null,
						value: null,
						fieldname: null
					};
					profileData.forEach(function (item, ind) {
						element.label = item.FieldLabel;
						element.fieldname = item.FieldName;
						if (item.FieldName === "POSID" || item.FieldName === "TASKCOMPONENT" || item.FieldName === "TASKTYPE" ||
							item.FieldName === "LSTNR") {
							element.value = aRow.WorkListDataFields[item.FieldName];
							item = $.extend(true, {}, element);
							data.push(item);
						}
						if (item.FieldName === "TASKLEVEL") {
							element.value = aRow.WorkListDataFields["Catstasklevel"];
							item = $.extend(true, {}, element);
							data.push(item);
						}
					});
					for (var i = 1; i < 4; i++) {
						element.label = this.oBundle.getText("text" + i);
						if (i === 1) {
							element.value = aRow.WorkListDataFields.ZTCTEXT;
						} else if (i === 2) {
							element.value = aRow.WorkListDataFields.ZTLTEXT;
						} else if (i === 3) {
							element.value = aRow.WorkListDataFields.ZTTTEXT;
						}
						item = $.extend(true, {}, element);
						data.push(item);
					}
					var oModel = new JSONModel(data);
					this.setModel(oModel, "TimeDataDetail");
					var oDialog;
					if (oDialog) {
						oDialog.close();
					}
					var oDialogController = {
						handleClose: function (event) {
							oDialog.close();
						}
					};
					if (!oDialog) {
						oDialog = sap.ui.xmlfragment(this.getView().getId(), "cgdc.timesheet.view.fragment.AssignmentQuickView",
							oDialogController);
						this.getView().addDependent(oDialog);
					}
					// delay because addDependent will do a async rerendering and the popover will immediately close without it
					var oButton = oEvent.getSource();
					jQuery.sap.delayedCall(0, this, function () {
						oDialog.openBy(oButton);
					});
				} else {
					sap.m.MessageToast.show("Delimited WBS");
				}
			}
		},
		calculateChangeCount: function () {
			var data = this.getModel('TimeData').getData();
			var controls = this.getModel('controls').getData();
			var newRecords = $.grep(data, function (element, index) {
				return element.TimeEntryOperation == 'C';
			});
			var updateRecords = $.grep(data, function (element, index) {
				return element.TimeEntryOperation == 'U';
			});
			var selectedRecords = $.grep(data, function (element, index) {
				return element.TimeEntryOperation == 'R';
			});
			if (selectedRecords.length > 0) {
				controls.numberOfRecords = selectedRecords.length;
			} else {
				controls.numberOfRecords = newRecords.length + updateRecords.length;
			}
			this.getModel('controls').setData(controls);
		},
		showConfirmBox: function (oEvent, ok) {
			var that = this;
			var oDialogController = {
				handleClose: function (oEvent) {
					that._oDialog.destroy();
				},
				handleConfirmationDiscard: function (oEvent) {
					ok();
					that._oDialog.destroy();
				}
			};
			// if (!this._oDialog) {
			this._oDialog = sap.ui.xmlfragment(this.getView().getId(), "cgdc.timesheet.view.fragment.CancelConfirmationPopOver",
				oDialogController);
			this.getView().addDependent(this._oDialog);
			this._oDialog.openBy(oEvent.getSource());
		},
		onCancel: function () {
			var that = this;
			var oControl = this.getModel('controls');
			oControl.setProperty('/duplicateVisibility', false);
			oControl.setProperty('/duplicateWeekVisibility', false);
			oControl.setProperty('/overviewEdit', true);
			oControl.setProperty('/onEdit', "None");
			oControl.setProperty('/showFooter', false);
			oControl.setProperty('/overviewDataChanged', false);
			oControl.setProperty('/isOverviewChanged', false);
			that.bindTable(new Date(that.startdate), new Date(that.enddate));
			this.rebindTableWithTemplate(this.oTable, "TimeData>/", this.oReadOnlyTemplate, "Navigation");
			var data = {};
			var oModel = new JSONModel();
			oModel.setData(data);
			this.setModel(oModel, 'deleteRecords');
			this.setModel(oModel, 'changedRecords');
			this.setModel(oModel, 'newRecords');
			this.setModel(oControl, "controls");
			sap.ui.getCore().getMessageManager().removeAllMessages();
		},
		rebindTableWithTemplate: function (oTable, sPath, oTemplate, sKeyboardMode) {
			if (sPath === 'TimeData>/' && sap.ui.Device.system.phone === true) {
				oTable.bindItems({
					path: sPath,
					sorter: [new sap.ui.model.Sorter("HeaderData", false, true, this.compareRows)],
					template: oTemplate,
					templateShareable: true,
					groupHeaderFactory: this.getGroupHeader.bind(this)
				}).setKeyboardMode(sKeyboardMode);
			}
		},
		rebindTableWithTemplateAdmin: function (oTable, sPath, oTemplate, sKeyboardMode) {
			if (sPath === 'TimeDataAdmin>/' && sap.ui.Device.system.phone === true) {
				oTable.bindItems({
					path: sPath,
					sorter: [new sap.ui.model.Sorter("HeaderData", false, true, this.compareRows)],
					template: oTemplate,
					templateShareable: true,
					groupHeaderFactory: this.getGroupHeader1.bind(this)
				}).setKeyboardMode(sKeyboardMode);
			}
		},
		compareRows: function (a, b) {
			if (new Date(a.date) > new Date(b.date)) {
				return 1;
			} else if (new Date(b.date) > new Date(a.date)) {
				return -1;
			}
		},
		getGroupHeader1: function (oGroup, count) {
			oGroup.key = this.oFormatDate.format(new Date(oGroup));
			return new GroupHeaderListItem({
				title: oGroup.key,
				upperCase: false
			});

		},
		getGroupHeader: function (oGroup, count) {
			oGroup.key = this.oFormatDate.format(new Date(oGroup.date));
			return new GroupHeaderListItem({
				title: oGroup.key,
				upperCase: false
			});
		},
		onPersButtonPressed: function (oEvent) {
			this.oTablePersoController.openDialog();
		},
		initPersonalization: function () {
			var that = this;
			if (sap.ushell.Container) {
				var oPersonalizationService = sap.ushell.Container.getService("Personalization");
				var oPersonalizer = oPersonalizationService.getPersonalizer({
					container: "cgdc.timesheet", // This key must be globally unique (use a key to identify the app) -> only 40 characters are allowed
					item: "idOverviewTable" // Maximum of 40 characters applies to this key as well
				});
				this.oTablePersoController = new TablePersoController({
					table: this.oTable,
					componentName: "MyTimesheet",
					persoService: oPersonalizer
				}).activate();
				this.oTablePersoController.getPersoService().getPersData().done(function (data) {
					if (data) {
						var startTime = $.grep(data.aColumns, function (element, ind) {
							return element.id.split('-')[element.id.split('-').length - 1] === "startTime";
						});
						var endTime = $.grep(data.aColumns, function (element, ind) {
							return element.id.split('-')[element.id.split('-').length - 1] === "endTime";
						});
						var draft = $.grep(data.aColumns, function (element, ind) {
							return element.id.split('-')[element.id.split('-').length - 1] === "draft";
						});
						var entered = $.grep(data.aColumns, function (element, ind) {
							return element.id.split('-')[element.id.split('-').length - 1] === "entered";
						});
						if (that.clockTimeVisible) {
							startTime[0].visible = true;
							endTime[0].visible = true;
						} else {
							startTime[0].visible = false;
							endTime[0].visible = false;
						}
						if (that.draftStatus) {
							draft[0].visible = true;
						} else {
							draft[0].visible = false;
						}
						if (sap.ui.Device.system.phone === true) {
							entered[0].visible = true;
						} else {
							entered[0].visible = false;
						}
						that.oTablePersoController.getPersoService().setPersData(data).done(function () {});
					}
				});
			}
		},
		onMainTimeEntriesItemPress: function (oEvent) {
			this.setcalenderinBase(this.mCalendar);
			var oItem = oEvent.getParameters("listItem").listItem;
			var sPath = oEvent.getParameters("listItem").listItem.getBindingContextPath();
			var iIndex = sPath.split("/")[1];
			var sPosId = oEvent.getParameters("listItem").listItem.getModel("aTableRows").getObject(sPath);
			var oWorkListModel = this.getModel("TimeData");
			var aWorkListData = oWorkListModel.getData();
			var aRows = aWorkListData.filter(function (entry, id) {
				return entry.TimeEntryDataFields.POSID === sPosId.posid;
			});
			var oWorkListModel1 = this.getModel("Worklist");
			var aWorkListData1 = oWorkListModel1.getData();
			var aRow = aWorkListData1.find(function (entry, id) {
				return entry.WorkListDataFields.POSID === sPosId.posid;
			});
			if (aRows.length && aRow) {
				for (var i = 0; i < aRows.length; i++) {
					aRows[i].TimeEntryDataFields.AWART = "WRK";
					aRows[i].TimeEntryDataFields.LSTNR = aRow.WorkListDataFields.LSTNR;
					aRows[i].TimeEntryDataFields.LTXA1 = aRow.WorkListDataFields.LTXA1;
					aRows[i].TimeEntryDataFields.POSID = aRow.WorkListDataFields.POSID;
					aRows[i].TimeEntryDataFields.RPROJ = aRow.WorkListDataFields.RPROJ;
					aRows[i].TimeEntryDataFields.TASKCOMPONENT = aRow.WorkListDataFields.TASKCOMPONENT;
					aRows[i].TimeEntryDataFields.TASKLEVEL = aRow.WorkListDataFields.Catstasklevel;
					aRows[i].TimeEntryDataFields.TASKTYPE = aRow.WorkListDataFields.TASKTYPE;
					aRows[i].TimeEntryDataFields.LSTAR = aRow.WorkListDataFields.LSTAR; //Activity type
				}
			}
			this.getModel("TimeData").setData(aRows);
			var oDetailData = $.extend(true, [], this.getModel('aTableRows').getData());
			this.getModel("aTableRowsMain").setData(oDetailData);
			this.getModel("aTableRowsMain").refresh(true);
			var oRouter = this.getOwnerComponent().getRouter();
			oRouter.navTo("detail", {
				index: iIndex
			});
		},
		onAddTimeEntryPhone: function (oEvent) {
			this.getModel("controls").setProperty("/flexContentProjects", true);
			this.getModel("controls").setProperty("/flexContentMain", false);
			this.getModel("controls").setProperty("/showFoooterMain", false);
			this.getModel("controls").setProperty("/shownavbuttonMain", true);
		},
		onNavButtonMainPage: function (oEvent) {
			if (this.getModel("controls").getProperty("/flexContentProjects") === true) {
				this.getModel("controls").setProperty("/flexContentMain", true);
				this.getModel("controls").setProperty("/showFoooterMain", true);
				this.getModel("controls").setProperty("/flexContentProjects", false);
				this.getModel("controls").setProperty("/shownavbuttonMain", false);
			}
		},
		setAdminTimeData: function (sSelectedKey) {
			var that = this;
			var oDate = new Date(that.mCalendar.getStartDate());
			var startDate = that.getFirstDayOfWeek(oDate, 1);
			var endDate = that.getLastDayOfWeek(oDate, 1);
			var entries = $.extend(true, [], this.getModel('TimeEntries').getData());
			var aAwarts = [];
			var timedata = [];
			aAwarts.push(sSelectedKey);
			for (var j = 0; j < aAwarts.length; j++) {
				for (var i = startDate; i <= endDate; i.setDate(i.getDate() + 1)) {
					var dateSearch = i;
					var daterecords = $.grep(entries, function (element, index) {
						//	return that.oFormatyyyymmdd.format(element.CaleDate) == that.oFormatyyyymmdd.format(dateSearch) && element.Status !== '99';
						var date = new Date(element.CaleDate.substring(0, 4) + "-" + element.CaleDate.substring(4, 6) + "-" + element.CaleDate.substring(
							6, 8));
						date = new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
						return that.oFormatyyyymmdd.format(date) == that.oFormatyyyymmdd.format(dateSearch) && element.Status !== '99';
					});
					if (daterecords.length === 0) {
						continue;
					}
					var date1 = new Date(daterecords[0].CaleDate.substring(0, 4) + "-" + daterecords[0].CaleDate.substring(4, 6) + "-" +
						daterecords[
							0].CaleDate.substring(
							6, 8));
					date1 = new Date(date1.getUTCFullYear(), date1.getUTCMonth(), date1.getUTCDate());
					startDate.setHours(0);
					startDate.setMinutes(0);
					startDate.setSeconds(0);
					startDate.setMilliseconds(0);
					var recordTemplate = {
						AllowEdit: "",
						AllowRelease: "",
						AssignmentId: "",
						AssignmentName: "",
						CatsDocNo: "",
						Counter: "",
						Pernr: this.empID,
						RefCounter: "",
						RejReason: "",
						Status: "",
						SetDraft: false,
						HeaderData: {
							target: "0.00",
							sum: "0.00",
							//	date: new Date(i),
							date: date1,
							addButton: false,
							highlight: false
						},
						target: "0.00",
						TimeEntryDataFields: {
							AENAM: "",
							ALLDF: "",
							APDAT: null,
							APNAM: "",
							ARBID: "00000000",
							ARBPL: "",
							AUERU: "",
							AUFKZ: "",
							AUTYP: "00",
							//	AWART: aAdminData[j].key,
							AWART: aAwarts[j],
							BEGUZ: "000000",
							BELNR: "",
							BEMOT: "",
							BUDGET_PD: "",
							BUKRS: "",
							BWGRL: "0.0",
							CATSAMOUNT: "0.0",
							CATSHOURS: "0.00",
							CATSQUANTITY: "0.0",
							CPR_EXTID: "",
							CPR_GUID: "",
							CPR_OBJGEXTID: "",
							CPR_OBJGUID: "",
							CPR_OBJTYPE: "",
							ENDUZ: "000000",
							ERNAM: "",
							ERSDA: "",
							ERSTM: "",
							ERUZU: "",
							EXTAPPLICATION: "",
							EXTDOCUMENTNO: "",
							EXTSYSTEM: "",
							FUNC_AREA: "",
							FUND: "",
							GRANT_NBR: "",
							HRBUDGET_PD: "",
							HRCOSTASG: "0",
							HRFUNC_AREA: "",
							HRFUND: "",
							HRGRANT_NBR: "",
							HRKOSTL: "",
							HRLSTAR: "",
							KAPAR: "",
							KAPID: "00000000",
							KOKRS: "",
							LAEDA: "",
							LAETM: "",
							LGART: "",
							LOGSYS: "",
							LONGTEXT: "",
							LONGTEXT_DATA: "",
							LSTAR: "",
							LSTNR: "",
							LTXA1: "",
							MEINH: "",
							OFMNW: "0.0",
							OTYPE: "",
							PAOBJNR: "0000000000",
							PEDD: null,
							PERNR: "00000000",
							PLANS: "00000000",
							POSID: "",
							PRAKN: "",
							PRAKZ: "0000",
							PRICE: "0.0",
							RAPLZL: "00000000",
							RAUFNR: "",
							RAUFPL: "0000000000",
							REASON: "",
							REFCOUNTER: "000000000000",
							REINR: "0000000000",
							RKDAUF: "",
							RKDPOS: "000000",
							RKOSTL: "",
							RKSTR: "",
							RNPLNR: "",
							RPROJ: "00000000",
							RPRZNR: "",
							SBUDGET_PD: "",
							SEBELN: "",
							SEBELP: "00000",
							SKOSTL: "",
							SPLIT: "0",
							SPRZNR: "",
							STATKEYFIG: "",
							STATUS: "",
							S_FUNC_AREA: "",
							S_FUND: "",
							S_GRANT_NBR: "",
							TASKCOMPONENT: "",
							TASKCOUNTER: "",
							TASKLEVEL: "",
							TASKTYPE: "",
							TCURR: "",
							TRFGR: "",
							TRFST: "",
							UNIT: "",
							UVORN: "",
							VERSL: "",
							VORNR: "",
							VTKEN: "",
							WABLNR: "",
							WAERS: "",
							WERKS: "",
							//	WORKDATE: new Date(i),
							WORKDATE: date1,
							WORKITEMID: "000000000000",
							WTART: ""
						},
						TimeEntryOperation: ""
					};
					var sumHours = 0;
					if (daterecords[0].TimeEntries.results.length !== 0) {
						for (var k = 0; k < daterecords[0].TimeEntries.results.length; k++) {
							var aRow = daterecords[0].TimeEntries.results.find(function (entry, id) {
								//	return entry.TimeEntryDataFields.AWART === aAdminData[j].key;
								return entry.TimeEntryDataFields.AWART === aAwarts[j];
							});
							if (aRow) {
								aRow.target = daterecords[0].TargetHours;
								aRow.TimeEntryDataFields.CATSHOURS = parseFloat(daterecords[0].TimeEntries.results[k].TimeEntryDataFields
									.CATSHOURS).toFixed(2);
								if (aRow.TimeEntryDataFields.STATUS !== '10' && aRow.TimeEntryDataFields
									.STATUS !== '40') {
									sumHours = parseFloat(sumHours) + parseFloat(aRow.TimeEntryDataFields
										.CATSHOURS);
								}
								timedata.push(aRow);
							} else {
								timedata.push(recordTemplate);
							}
							break;
						}
					} else {
						timedata.push(recordTemplate);
					}
				}
				startDate = that.getFirstDayOfWeek(oDate, 1);
				startDate.setHours(0);
				startDate.setMinutes(0);
				startDate.setSeconds(0);
				startDate.setMilliseconds(0);
			}
			startDate = that.getFirstDayOfWeek(oDate, 1);
			startDate.setHours(0);
			startDate.setMinutes(0);
			startDate.setSeconds(0);
			startDate.setMilliseconds(0);
			that.mCalendar.setStartDate(startDate);
			for (var i = 0; i < timedata.length; i++) {
				if (timedata[i].TimeEntryDataFields.STATUS === "10") {
					timedata[i].SetDraft = true;
				}
			}
			return timedata;
		},
		onAdminTypePress: function (oEvent) {
			var that = this;
			var aExistingaTableRowsAbs = this.getModel("aTableRowsAbs").getData();
			var aExistingTimeData = this.getModel("TimeData").getData();
			var sSelectedKey = oEvent.getParameters().listItem.getDescription();
			var oDetailData, oDetailDataTime;
			var oDate = new Date(that.mCalendar.getStartDate());
			var startDate = that.getFirstDayOfWeek(oDate, 1);
			var endDate = that.getLastDayOfWeek(oDate, 1);
			var entries = $.extend(true, [], this.getModel('TimeEntries').getData());
			if (aExistingaTableRowsAbs.length) {
				var aRow = aExistingaTableRowsAbs.filter(function (entry, id) {
					return entry.admintype === sSelectedKey;
				});
				if (aRow.length) {
					oDetailData = $.extend(true, [], aRow);
				} else {
					this.prepareTableDataAbsence(entries, startDate, endDate, sSelectedKey);
					oDetailData = $.extend(true, [], this.getModel("aTableRowsAbs").getData());
				}
			} else {
				this.prepareTableDataAbsence(entries, startDate, endDate, sSelectedKey);
				oDetailData = $.extend(true, [], this.getModel("aTableRowsAbs").getData());
			}
			this.getModel("aTableRowsMain").setData(oDetailData);
			this.getModel("aTableRowsMain").refresh(true);

			if (aExistingTimeData.length) {
				var aRows = aExistingTimeData.filter(function (entry, id) {
					return entry.TimeEntryDataFields.AWART === sSelectedKey;
				});
				if (aRows.length) {
					oDetailDataTime = $.extend(true, [], aRows);
				} else {
					oDetailDataTime = this.setAdminTimeData(sSelectedKey);
				}
			} else {
				oDetailDataTime = this.setAdminTimeData(sSelectedKey);
			}
			this.getModel("TimeData").setData(oDetailDataTime);
			this.getModel("TimeData").refresh(true);
			var oRouter = this.getOwnerComponent().getRouter();
			oRouter.navTo("detail", {
				index: 0
			});

		},
		onWorkListTypePress: function (oEvent) {
			var that = this;
			var oDetailDataTime, oDetailData;
			var aExistingTimeData = this.getModel("TimeData").getData();
			var aExistingTimeDataTemp = $.extend(true, [], this.getModel('TimeData').getData());
			var aExistingaTableRows = this.getModel("aTableRows").getData();
			var sPath = oEvent.getSource().getBindingContextPath();
			var oDate = new Date(that.mCalendar.getStartDate());
			var startDate = that.getFirstDayOfWeek(oDate, 1);
			var endDate = that.getLastDayOfWeek(oDate, 1);
			var entries = $.extend(true, [], this.getModel('TimeEntries').getData());
			var sPosId = this.getModel("Worklist").getObject(sPath).WorkListDataFields.POSID;
			var sTc = this.getModel("Worklist").getObject(sPath).WorkListDataFields.TASKCOMPONENT;
			var sTl = this.getModel("Worklist").getObject(sPath).WorkListDataFields.Catstasklevel;
			var sTt = this.getModel("Worklist").getObject(sPath).WorkListDataFields.TASKTYPE;
			if (aExistingTimeDataTemp.length) {
				var aRows = aExistingTimeDataTemp.filter(function (entry, id) {
					return entry.TimeEntryDataFields.POSID === sPosId;
				});
				if (aRows.length) {
					oDetailDataTime = $.extend(true, [], aRows);
					this.getModel("TimeData").setData(oDetailDataTime);
				} else {
					this.getModel("TimeData").setData([]);
					this.addEntriesInTimeDataModel(sPosId, "WRK", sTc, sTl, sTt);
				}
			} else {
				this.getModel("TimeData").setData([]);
				this.addEntriesInTimeDataModel(sPosId, "WRK", sTc, sTl, sTt);
			}
			var oWorkListModel = this.getModel("TimeData");
			var aWorkListData = oWorkListModel.getData();
			var aRows = aWorkListData.filter(function (entry, id) {
				return entry.TimeEntryDataFields.POSID === sPosId;
			});
			var oWorkListModel1 = this.getModel("Worklist");
			var aWorkListData1 = oWorkListModel1.getData();
			var aRow = aWorkListData1.find(function (entry, id) {
				return entry.WorkListDataFields.POSID === sPosId;
			});
			if (aRows.length && aRow) {
				for (var i = 0; i < aRows.length; i++) {
					aRows[i].TimeEntryDataFields.AWART = "WRK";
					aRows[i].TimeEntryDataFields.LSTNR = aRow.WorkListDataFields.LSTNR;
					aRows[i].TimeEntryDataFields.LTXA1 = aRow.WorkListDataFields.LTXA1;
					aRows[i].TimeEntryDataFields.RPROJ = aRow.WorkListDataFields.RPROJ;
					aRows[i].TimeEntryDataFields.LSTAR = aRow.WorkListDataFields.LSTAR; //Activity type
				}
			}
			//	this.getModel("TimeData").setData(oDetailDataTime);
			this.getModel("TimeData").refresh(true);
			if (aExistingaTableRows.length) {
				var aRow = aExistingaTableRows.filter(function (entry, id) {
					return entry.posid === sPosId;
				});
				if (aRow.length) {
					oDetailData = $.extend(true, [], aRow);
				} else {
					this.prepareTableData(entries, startDate, endDate, sPosId);
					oDetailData = $.extend(true, [], this.getModel("aTableRows").getData());
				}
			} else {
				this.prepareTableData(entries, startDate, endDate, sPosId);
				oDetailData = $.extend(true, [], this.getModel("aTableRows").getData());
			}
			this.getModel("aTableRowsMain").setData(oDetailData);
			this.getModel("aTableRowsMain").refresh(true);
			var oRouter = this.getOwnerComponent().getRouter();
			oRouter.navTo("detail", {
				index: 0
			});
		},
		onSwipeMainTimeEntries: function (oEvent) {
			this.setcalenderinBase(this.mCalendar);
			oEvent.preventDefault();
			var oItem = oEvent.getParameters("listItem").listItem;
			var sPath = oEvent.getParameters("listItem").listItem.getBindingContextPath();
			var iIndex = sPath.split("/")[1];
			var sPosId = oEvent.getParameters("listItem").listItem.getModel("aTableRows").getObject(sPath);
			var oWorkListModel = this.getModel("TimeData");
			var aWorkListData = oWorkListModel.getData();
			var aRows = aWorkListData.filter(function (entry, id) {
				return entry.TimeEntryDataFields.POSID === sPosId.posid;
			});
			var oWorkListModel1 = this.getModel("Worklist");
			var aWorkListData1 = oWorkListModel1.getData();
			var aRow = aWorkListData1.filter(function (entry, id) {
				return entry.WorkListDataFields.POSID === sPosId.posid;
			});
			if (aRows.length && aRow) {
				for (var i = 0; i < aRows.length; i++) {
					aRows[i].TimeEntryDataFields.AWART = "WRK";
					aRows[i].TimeEntryDataFields.LSTNR = aRow.WorkListDataFields.LSTNR;
					aRows[i].TimeEntryDataFields.LTXA1 = aRow.WorkListDataFields.LTXA1;
					aRows[i].TimeEntryDataFields.POSID = aRow.WorkListDataFields.POSID;
					aRows[i].TimeEntryDataFields.RPROJ = aRow.WorkListDataFields.RPROJ;
					aRows[i].TimeEntryDataFields.TASKCOMPONENT = aRow.WorkListDataFields.TASKCOMPONENT;
					aRows[i].TimeEntryDataFields.TASKLEVEL = aRow.WorkListDataFields.Catstasklevel;
					aRows[i].TimeEntryDataFields.TASKTYPE = aRow.WorkListDataFields.TASKTYPE;
					aRows[i].TimeEntryDataFields.LSTAR = aRow.WorkListDataFields.LSTAR; //Activity type
				}
			}
			this.getModel("TimeData").setData(aRows);
			var oDetailData = $.extend(true, [], this.getModel('aTableRows').getData());
			this.getModel("aTableRowsMain").setData(oDetailData);
			this.getModel("aTableRowsMain").refresh(true);
			var oRouter = this.getOwnerComponent().getRouter();
			oRouter.navTo("detail", {
				index: iIndex
			});
		},
		onSwipeAdminTypes: function (oEvent) {
			oEvent.preventDefault();
			var that = this;
			var aExistingaTableRowsAbs = this.getModel("aTableRowsAbs").getData();
			var aExistingTimeData = this.getModel("TimeData").getData();
			var sSelectedKey = oEvent.getParameters().listItem.getDescription();
			var oDetailData, oDetailDataTime;
			var oDate = new Date(that.mCalendar.getStartDate());
			var startDate = that.getFirstDayOfWeek(oDate, 1);
			var endDate = that.getLastDayOfWeek(oDate, 1);
			var entries = $.extend(true, [], this.getModel('TimeEntries').getData());
			if (aExistingaTableRowsAbs.length) {
				var aRow = aExistingaTableRowsAbs.find(function (entry, id) {
					return entry.admintype === sSelectedKey;
				});
				if (aRow) {
					oDetailData = $.extend(true, [], aRow);
				} else {
					this.prepareTableDataAbsence(entries, startDate, endDate, sSelectedKey);
					oDetailData = $.extend(true, [], this.getModel("aTableRowsAbs").getData());
				}
			} else {
				this.prepareTableDataAbsence(entries, startDate, endDate, sSelectedKey);
				oDetailData = $.extend(true, [], this.getModel("aTableRowsAbs").getData());
			}
			this.getModel("aTableRowsMain").setData(oDetailData);
			this.getModel("aTableRowsMain").refresh(true);
			if (aExistingTimeData.length) {
				var aRows = aExistingTimeData.filter(function (entry, id) {
					return entry.TimeEntryDataFields.AWART === sSelectedKey;
				});
				if (aRows.length) {
					oDetailDataTime = $.extend(true, [], aRows);
				} else {
					oDetailDataTime = this.setAdminTimeData(sSelectedKey);
				}
			} else {
				oDetailDataTime = this.setAdminTimeData(sSelectedKey);
			}
			this.getModel("TimeData").setData(oDetailDataTime);
			this.getModel("TimeData").refresh(true);
			var oRouter = this.getOwnerComponent().getRouter();
			oRouter.navTo("detail", {
				index: 0
			});
		},
		onWorkLocValueHelpRequest: function (oEvent) {
			var that = this;
			var oTimeData = oEvent.getSource().getParent().getBindingContext('TimeData').getObject();
			var oModel = new sap.ui.model.json.JSONModel();
			var oDate = oTimeData.TimeEntryDataFields.WORKDATE;
			var aFilter = [];
			aFilter.push(new sap.ui.model.Filter("WRK_DATE", sap.ui.model.FilterOperator.EQ, this.oFormatYyyymmdd.format(oDate)));
			
			this.busyDialog.open();
			
			var mParameters = {
				filters: aFilter,
				success: function (oData, oResponse) {
					that.busyDialog.close();
					oModel.setData(oData.results);
					that.getView().setModel(oModel, "WorkLocations");
					if (!that.tcValueHelpDialog) {
						that.tcValueHelpDialog = sap.ui.xmlfragment(that.getView().getId(), "cgdc.timesheet.view.fragment.TimeCategoryValueHelp", that);
						that.getView().addDependent(that.tcValueHelpDialog);
					}

					that.tcValueHelpDialog.open();
				},
				error: function (oError) {
					that.busyDialog.close();
					that.oErrorHandler.processError(oError);
				}
			};
			this.oDataModel.read('/VL_SH_xCGDCxSH_WRKLOC', mParameters);

		},
		onWLValueHelpSelectedItem: function (oEvent) {
			var tcId = oEvent.getParameter("listItem").getBindingContext("WorkLocations").getObject().SHORT;
			this.getView().byId("idWorkLoc").setValue(tcId);
			this.onWLValueHelpDialogClose();
		},

		onWLValueHelpDialogClose: function (oEvent) {
			this.tcValueHelpDialog.close();
			this.tcValueHelpDialog.destroy();
			this.tcValueHelpDialog = "";
		},
		/**
		 * Similar to onAfterRendering, but this hook is invoked before the controller's View is re-rendered
		 * (NOT before the first rendering! onInit() is used for that one!).
		 * @memberOf cgdc.timesheet.view.main
		 */
		onBeforeRendering: function () {},

		/**
		 * Called when the View has been rendered (so its HTML is part of the document). Post-rendering manipulations of the HTML could be done here.
		 * This hook is the same one that SAPUI5 controls get after being rendered.
		 * @memberOf cgdc.timesheet.view.main
		 */
		onAfterRendering: function () {},

		/**
		 * Called when the Controller is destroyed. Use this one to free resources and finalize activities.
		 * @memberOf cgdc.timesheet.view.main
		 */
		onExit: function () {
			// if (this.oTablePersoController) {
			// 	this.oTablePersoController.destroy();
			// 	delete this.oTablePersoController;
			// }
		}

	});

});