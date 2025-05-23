sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"cgdc/timesheet/model/formatter",
	'sap/m/GroupHeaderListItem',
	"/sap/ui/model/json/JSONModel"
], function (Controller, formatter, GroupHeaderListItem, JSONModel) {
	"use strict";
	var oDataModel = null;
	var oBundle = null;
	var oPernr = null;
	var oRouter = null;
	this.oFormatyyyymmdd = sap.ui.core.format.DateFormat.getInstance({
		pattern: "yyyyMMdd",
		calendarType: sap.ui.core.CalendarType.Gregorian
	});
	this.oFormatYyyymmdd = sap.ui.core.format.DateFormat.getInstance({
		pattern: "yyyy-MM-dd",
		calendarType: sap.ui.core.CalendarType.Gregorian
	});
	this.oFormatDate = sap.ui.core.format.DateFormat.getInstance({
		style: "full",
		calendarType: sap.ui.core.CalendarType.Gregorian
	});
	this.busyDialog = new sap.m.BusyDialog();
	this.mCalendar = "";
	return Controller.extend("cgdc.timesheet.controller.BaseController", {
		formatter: formatter,
		fetchRecordsPhone: function (oRelease) {
			var timeEntries = [];
			var entries = $.extend(true, [], this.getModel('TimeData').getData());
			//	var entries = this.getModel('TimeData').getData();
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
		getCheckChangedItemsSaveSubmit: function () {
			var bCheck = false;
			var aEntries = this.getModel('TimeData').getData();
			var aEntryFound = aEntries.filter(function (entry, id) {
				// console.log(entry)
				return entry.Counter || (!entry.Counter && entry.TimeEntryOperation === "C");
			});
			if (aEntryFound.length !== 0) {
				bCheck = true;
			}
			return bCheck;

		},
		getForattedsText: function (aRow) {
			var aArrayInitial = [],
				aArrayFinal = [];
			aArrayInitial.push(aRow.WorkListDataFields.CatsxtTaskcomponentText);
			aArrayInitial.push(aRow.WorkListDataFields.CatsxtTasklevelText);
			aArrayInitial.push(aRow.WorkListDataFields.CatsxtTasktypeText);
			for (var k = 0; k < aArrayInitial.length; k++) {
				if (aArrayInitial[k]) {
					aArrayFinal.push(aArrayInitial[k]);
				}
			}
			var sText = "";
			if (aArrayFinal.length) {
				for (var j = 0; j < aArrayFinal.length; j++) {
					sText += aArrayFinal[j] + ",";
				}
			} else {
				sText = "";
			}
			sText = sText.replace(/,*$/, '');
			return sText;
		},
		getWorkPackFilters: function () {
			var aFilters = [];
			var sPspid = this.getModel("WorkPackData").getProperty("/PspnrChar");
			var data = this.getModel("WorkPackList").getData();
			var c = new sap.ui.model.Filter({
				path: "Psphi",
				operator: sap.ui.model.FilterOperator.EQ,
				value1: sPspid
			});
			aFilters.push(c);
			var e = new sap.ui.model.Filter({
				path: "Plakz",
				operator: sap.ui.model.FilterOperator.EQ,
				value1: true
			});
			aFilters.push(e);
			for (var i = 0; i < data.length; i++) {
				var d = new sap.ui.model.Filter({
					path: "Posid",
					operator: sap.ui.model.FilterOperator.NE,
					value1: data[i].WorkListDataFields.POSID
				});
				aFilters.push(d);
			}
			return aFilters;
		},
		fetchRecords: function (oRelease) {
			var timeEntries = [];
			//var deleteRecords = this.getModel('deleteRecords').getData();
			var entries = this.getModel('TimeData').getData();
			var newRecords = $.grep(entries, function (element, index) {
				return element.TimeEntryOperation == 'C';
			});
			var changedRecords = $.grep(entries, function (element, index) {
				return element.TimeEntryOperation == 'U';
			});
			var deleteRecords = $.grep(entries, function (element, index) {
				return element.TimeEntryOperation == 'D';
			});
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
			for (var i = 0; i < deleteRecords.length; i++) {
				if (!deleteRecords[i].Counter) {
					deleteRecords.splice(i, 1);
					i--;
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
			for (var i = 0; i < timeEntries.length; i++) {
				//	timeEntries[i].RecRowNo = (i + 1).toString();
				if (timeEntries[i].TimeEntryDataFields.CATSHOURS === "" || timeEntries[i].TimeEntryDataFields.CATSHOURS === 0) {
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
			}
			return copiedEntries;

		},
		onCreateMissingProject1: function (oEvent) { },
		setcalenderinBase: function (oCalendar) {
			this.mCalendar = oCalendar;
		},
		getcalendarBase: function () {
			return this.mCalendar;
		},
		finalSubmit: function (rowDelete) {
			var that = this;
			this.oDataModel = that.getOwnerComponent().getModel();
			var oRouter = that.getOwnerComponent().getRouter();
			var oControl = this.getModel("controls");
			var submitEntries = this.fetchRecords(true);
			//			Location/Timecategory hide/disable/mandatory
			if (!this.getModel("controls").getProperty("/columnTimeCategoryVisibility") ||
				!this.getModel("controls").getProperty("/columnLocationVisibility")) {
				submitEntries.forEach(ele => {
					if (!this.getModel("controls").getProperty("/columnLocationVisibility")) {
						ele.TimeEntryDataFields.WrkLoc = '';
					}
					if (!this.getModel("controls").getProperty("/columnTimeCategoryVisibility")) {
						ele.TimeEntryDataFields.ProjTimeCat = '';
					}
				});
			}
			//			Location/Timecategory hide/disable/mandatory				
			for (var c = 0; c < submitEntries.length; c++) {
				submitEntries[c].RecRowNo = (c + 1).toString();
				if ((submitEntries[c].TimeEntryDataFields.CATSHOURS == 0 || submitEntries[c].TimeEntryDataFields.CATSHOURS == "0.00") && (
					submitEntries[c].TimeEntryDataFields.CATSAMOUNT == 0) && (
						submitEntries[c].TimeEntryDataFields.CATSQUANTITY == 0) && (submitEntries[c].TimeEntryDataFields.STATUS !== "10") ||
					(submitEntries[c].TimeEntryDataFields.STATUS === "99")) {
					submitEntries.splice(c, 1);
					//If start time and end time are also not specified then do not consider record for submit
					// (submitEntries[c].TimeEntryDataFields.STATUS === "30" ||
					c--;
				}
			}
			var oModel = $.extend(true, {}, this.oDataModel);
			var oControl = this.getModel("controls");
			this.batches = submitEntries;
			var mParameters;
			oModel.setChangeBatchGroups({
				"*": {
					groupId: "TimeEntry1",
					changeSetId: "TimeEntry1",
					single: true
				}
			});
			oModel.setDeferredGroups(["TimeEntry1"]);
			oModel
				.refreshSecurityToken(
					function (oData) {
						if (submitEntries.length === 0) {
							that.busyDialog.close();
							//	that.hideBusy(true);
							var toastMsg = that.getResourceBundle().getText("noEntriesToSubmit");
							sap.m.MessageToast.show(toastMsg, {
								duration: 3000
							});
							return;
						}
						for (var i = 0; i < submitEntries.length; i++) {
							var obj = {
								properties: submitEntries[i],
								changeSetId: "TimeEntry1",
								groupId: "TimeEntry1"
							};
							oModel
								.createEntry(
									"/TimeEntryCollection",
									obj);
						}

						oModel.submitChanges({
							groupId: "TimeEntry1",
							changeSetId: "TimeEntry1",
							success: function (oData, res) {
								that.busyDialog.close();
								that.cellModified = "";
								that.entryCopied = false;
								oControl.setProperty("/entryCopied", false);
								if (that.oMessagePopover) {
									// that.oMessagePopover.removeAllItems();
									that.oMessagePopover.destroy();
									sap.ui.getCore().getMessageManager().removeAllMessages();
									// that.oMessagePopover.setModel(sap.ui.getCore().getMessageManager().getMessageModel(), "message");
								}
								var error = false;
								var entries = that.getModel('TimeData').getData();
								var oMessages = [];
								if (!oData.__batchResponses[0].__changeResponses) {
									var messageText = "";
									var messageType = "";
									var errorJSON = JSON.parse(oData.__batchResponses[0].response.body);
									var totalLength = errorJSON.error.innererror.errordetails.length - 1;
									sap.ui.getCore().getMessageManager().removeAllMessages();
									// Additional coding to handle error message(s)
									for (var len = 0; len < totalLength; len++) {
										messageText = errorJSON.error.innererror.errordetails[len].message;
										messageType = errorJSON.error.innererror.errordetails[len].severity;
										if (messageType == "warning") {
											sap.ui.getCore().getMessageManager().addMessages(
												new sap.ui.core.message.Message({
													message: messageText,
													description: messageText,
													type: sap.ui.core.MessageType.Warning,
													processor: that.getOwnerComponent().oMessageProcessor,
													code: "TimeData"
												}));
										} else {
											sap.ui.getCore().getMessageManager().addMessages(
												new sap.ui.core.message.Message({
													message: messageText,
													description: messageText,
													type: sap.ui.core.MessageType.Error,
													processor: that.getOwnerComponent().oMessageProcessor,
													code: "TimeData"
												}));
											error = true;
										}
									}
									//if message type is error then add the last error message
									if (!errorJSON.error.innererror.errordetails[len].code.match("/IWBEP")) {
										messageText = errorJSON.error.innererror.errordetails[len].message;
										sap.ui.getCore().getMessageManager().addMessages(
											new sap.ui.core.message.Message({
												message: messageText,
												description: messageText,
												type: sap.ui.core.MessageType.Error,
												processor: that.getOwnerComponent().oMessageProcessor,
												code: "TimeData"
											}));
										error = true;
									}
									//	that.hideBusy(true);
									//	return;
								} else {
									for (var i = 0; i < oData.__batchResponses[0].__changeResponses.length; i++) {
										var entry = $.grep(entries, function (element, ind) {
											if (element.RecRowNo) {
												return element.RecRowNo === parseInt(oData.__batchResponses[0].__changeResponses[i].data.RecRowNo).toString();
											}
										});
										if (oData.__batchResponses[0].__changeResponses[i].data.ErrorMsg !== "") {
											error = true;
											//	if (entry.length > 0) {
											// entry[0].valueState = "Error";
											// entry[0].highlight = "Error";
											// entry[0].valueStateText = oData.__batchResponses[0].__changeResponses[i].data.ErrorMsg;
											oMessages.push(new sap.ui.core.message.Message({
												message: oData.__batchResponses[0].__changeResponses[i].data.ErrorMsg,
												description: oData.__batchResponses[0].__changeResponses[i].data.ErrorMsg,
												type: sap.ui.core.MessageType.Error,
												processor: that.getOwnerComponent().oMessageProcessor,
												additionalText: parseInt(oData.__batchResponses[0].__changeResponses[i].data.RecRowNo),
												code: "TimeData"
											}));
											//	}
											error = true;

										} else {
											if (entry.length > 0) {
												// entry[0].valueState = "Success";
												// entry[0].highlight = "Success";
											}
										}
									}
								}
								sap.ui.getCore().getMessageManager().addMessages(
									oMessages
								);

								// that.setModel(sap.ui.getCore().getMessageManager().getMessageModel(), "message");
								var toastMsg;
								if (!error) {
									if (rowDelete === "Submit") {
										toastMsg = that.getResourceBundle().getText("timeEntriesSubmitted");
									} else if (rowDelete === "Save") {
										toastMsg = that.getResourceBundle().getText("timeEntriesSaved");
									} else {
										toastMsg = that.getResourceBundle().getText("timeEntriesSaved");
									}
								} else {
									var oMsg = "";
									if (oMessages.length !== 0) {
										for (var i = 0; i < oMessages.length; i++) {
											if (oMessages[i].type !== "Error") {
												oMessages.splice(i, 1);
												i--;
											} else {
												oMsg += "\n" + oMessages[i].message;
											}
										}
										// console.log(oMsg)
										sap.m.MessageBox.error(oMsg, {
											title: "Error", // default
											onClose: null, // default
											styleClass: "", // default
											actions: sap.m.MessageBox.Action.CLOSE, // default
											emphasizedAction: null, // default
											initialFocus: null, // default
											textDirection: sap.ui.core.TextDirection.Inherit // default
										});
									}
									toastMsg = that.getResourceBundle().getText("resubmitTimeEntries");
								}
								sap.m.MessageToast.show(toastMsg, {
									duration: 1000
								});
								sap.ui.getCore().getMessageManager().removeAllMessages();
								var data = [];
								var oModel1 = new JSONModel();
								oModel1.setData(data);
								that.setModel(oModel1, 'deleteRecords');
								that.setModel(oModel1, 'changedRecords');
								that.setModel(oModel1, 'newRecords');
								if (sap.ui.Device.system.phone === true && rowDelete === undefined) {
									oControl.setProperty("/overviewEdit", true);
									oControl.setProperty("/overviewCancel", false);
									oControl.setProperty("/submitDraft", false);
									oControl.setProperty("/sendForApproval", false);
									oControl.setProperty("/duplicateVisibility", false);
									oControl.setProperty("/showFooter", false);
									oControl.setProperty("/duplicateWeekVisibility", false);
									oControl.setProperty("/onEdit", "None");
									oControl.setProperty('/overviewDataChanged', false);
									oControl.setProperty("/isOverviewChanged", false);
									that.setModel(oControl, "controls");
									oRouter.navTo("default", {});
								} else if (sap.ui.Device.system.phone === true && rowDelete === "Submit") {
									var oDate = new Date(that.mCalendar.getStartDate());
									that.startdate = that.getFirstDayOfWeek(oDate, 0);
									that.enddate = that.getLastDayOfWeek(oDate, 0);
									that.getTimeEntries(that.startdate, that.enddate);
								} else if (sap.ui.Device.system.phone === true && rowDelete === "COPYENTRYDEL") {
									var oDate = new Date(that.mCalendar.getStartDate());
									that.startdate = that.getFirstDayOfWeek(oDate, 0);
									that.enddate = that.getLastDayOfWeek(oDate, 0);
									// Added this for Copy Previous Week entries as part of CTS-57
									that.deleteCopiedEntriesModel();
									// Added this for Copy Previous Week entries as part of CTS-57
									that.getTimeEntries(that.startdate, that.enddate);
								} else {
									oControl.setProperty('/isDataChanged', false);
									var oDate = new Date(that.mCalendar.getStartDate());
									that.startdate = that.getFirstDayOfWeek(oDate, 0);
									that.enddate = that.getLastDayOfWeek(oDate, 0);
									that.getTimeEntries(that.startdate, that.enddate);
								}
							},
							error: function (oError) {
								//	that.hideBusy(true);
								that.busyDialog.close();
								that.oErrorHandler.processError(oError);
							}
						});

					}, true);
			//	oModel.attachBatchRequestCompleted(this.onSubmissionSuccess.bind(this));
			oModel.attachBatchRequestFailed(function () {
				that.handleMessagePopover(new sap.m.Button());
			});
		},
		setPayTotalHours: function (aTableArray) {
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
		},
		totalHoursAndPosId: function (aTableArray) {
			var oWorkListModel = this.getModel("Worklist");
			var aWorkListData = oWorkListModel.getData();
			var entries = this.getModel('TimeData').getData();
			var currCatsHours;

			for (var i = 0; i < aTableArray.length; i++) {
				var aRow = aWorkListData.find(function (entry, id) {
					return entry.WorkListDataFields.POSID === aTableArray[i].posid;
				});
				var totalEnteredHoursWeek = 0;
				var bApprovedEntryFound = false;
				if (aRow) {
					aTableArray[i]["posidtitle"] = aRow.WorkListDataFields.ZPOSIDTEXT;
				} else {
					aTableArray[i]["posidtitle"] = aTableArray[i].posid;
				}
				for (var j = 0; j < aTableArray[i].rowsdata.length; j++) {
					if (aTableArray[i].rowsdata[j].ProjTimeCat !== "" && aTableArray[i].rowsdata[j].ProjTimeCat !== undefined) {
						aTableArray[i]["timecat"] = aTableArray[i].rowsdata[j].ProjTimeCat;
					}
					if (aTableArray[i].rowsdata[j].WrkLoc !== "" && aTableArray[i].rowsdata[j].WrkLoc !== undefined) {
						aTableArray[i]["wrkloc"] = aTableArray[i].rowsdata[j].WrkLoc;
					}
					if (aTableArray[i].rowsdata[j].CATSHOURS !== "") {
						// currCatsHours = parseFloat(aTableArray[i].rowsdata[j].CATSHOURS.split(":")[0] + "." + aTableArray[i].rowsdata[j].CATSHOURS.split(
						// 	":")[1]);
						currCatsHours = this.timeToDecimal(aTableArray[i].rowsdata[j].CATSHOURS);
						totalEnteredHoursWeek = totalEnteredHoursWeek + currCatsHours;
					}
				}
				if (sap.ui.Device.system.phone === true) {
					//aTableArray[i]["totalweekcatsEntered"] = this.mobileAdjustTime(totalEnteredHoursWeek);
					aTableArray[i]["totalweekcatsEntered"] = this.formatMobileTime(totalEnteredHoursWeek);
				} else {
					aTableArray[i]["totalweekcatsEntered"] = parseFloat(totalEnteredHoursWeek).toFixed(2);
				}

				for (var k = 0; k < aTableArray[i].rowsdata.length; k++) {
					if (aTableArray[i].rowsdata[k].DayStatus === "DONE") {
						bApprovedEntryFound = true;
						break;
					}
				}
				if (bApprovedEntryFound) {
					aTableArray[i]["overallWeekStatus"] = true;
				} else {
					aTableArray[i]["overallWeekStatus"] = false;
				}
				//	}
			}
		},
		recordTemplate: function () {
			var that = this;
			var recordTemplate = {
				AllowEdit: "",
				AllowRelease: "",
				AssignmentId: "",
				AssignmentName: "",
				CatsDocNo: "",
				Counter: "",
				Pernr: that.empID,
				RefCounter: "",
				RejReason: "",
				Status: "",
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
					ERSDA: null,
					ERSTM: null,
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
					LAEDA: null,
					LAETM: null,
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
					WORKDATE: "",
					WORKITEMID: "000000000000",
					WTART: ""
				},
				TimeEntryOperation: ""
			};
			return recordTemplate;
		},
		calculateSum: function (oDate, data) {
			var that = this;
			var sum = parseFloat(0);
			oDate = this.oFormatyyyymmdd.format(oDate);
			var element = $.grep(data, function (element, index) {
				return that.oFormatyyyymmdd.format(new Date(element.TimeEntryDataFields.WORKDATE)) == oDate;
			});
			for (var i = 0; i < element.length; i++) {
				if (element[i].TimeEntryDataFields.STATUS !== '10' && element[i].TimeEntryDataFields.STATUS !== '40') {
					sum = (parseFloat(sum) + parseFloat(element[i].TimeEntryDataFields.CATSHOURS)).toFixed(2);
				}
			}
			for (var j = 0; j < data.length; j++) {
				if (that.oFormatyyyymmdd.format(new Date(data[j].TimeEntryDataFields.WORKDATE)) === oDate) {
					data[j].totalHours = sum;
					data[j].HeaderData.sum = sum;
				}
			}
			return data;

		},
		setControlModel: function () {
			//		var controlModel = new sap.ui.model.json.JSONModel({
			var odata = {
				showFooter: false,
				submitDraft: false,
				sendForApproval: false,
				clockEntry: false,
				overviewCancel: false,
				todoCancel: false,
				todoDone: false,
				taskEdit: false,
				taskDelete: false,
				taskCopy: false,
				duplicateVisibility: false,
				duplicateWeekVisibility: false,
				onEdit: "None",
				duplicateTaskEnable: false,
				duplicateWeekEnable: true,
				editLongTextEnabled: false,
				feedListVisibility: false,
				firstDayOfWeek: 0,
				isGroup: false,
				startDate: null,
				createAssignment: false,
				copyAssignment: false,
				displayAssignment: false,
				displayAssignmentCancel: false,
				editAssignment: false,
				assignmentTitle: null,
				tasksActiveLength: null,
				tasksInactiveLength: null,
				clockTimeVisible: false,
				editTodoVisibility: true,
				numberOfRecords: 0,
				overviewEditEnabled: true,
				importAssignment: true,
				showFooterAssignment: false,
				importWorklist: false,
				approverAllowed: false,
				displayGroup: false,
				groupReload: false,
				createGroup: false,
				EditGroup: false,
				DeleteGroup: false,
				isOverviewChanged: false,
				isToDoChanged: false,
				overviewDataChanged: false,
				todoDataChanged: false,
				showOverviewMessage: true,
				showAssignmentsMessage: true,
				showGroupMessage: true,
				duplicateTaskButtonEnable: false,
				duplicateWeekButtonEnable: false,
				entryCopied: false,
				prevWeekBut: false,
				showFoooterMain: true,
				flexContentMain: true,
				flexContentProjects: false,
				shownavbuttonMain: false,
				isDataChanged: false,
				saveEnabled: true,
				submitEnabled: true,
				createProjectSwitch: false,
				//			Location/Timecategory hide/disable/mandatory				
				columnLocationVisibility: false,
				columnLocationEnabled: false,
				columnLocationMandatory: false,
				columnTimeCategoryVisibility: false,
				columnTimeCategoryEnabled: false,
				columnTimeCategoryMandatory: false,
				changeReasonVisibility: false,
				changeReasonEnabled: false,
				changeReasonMandatory: false,
				commentsVisibility: false,
				commentsEnabled: false,
				commentsMandatory: false,
				//			Location/Timecategory hide/disable/mandatory
				// Added as part of CTS-57
				copiedDelPosID: "",
				totalDayHours: 0

			};
			this.getModel("controls").setData(odata);
		},
		performDeleteRows: function (oTable) {
			var that = this;
			var colhead, coldate, sYear;
			var aggr = oTable.getItems();
			var clmnAts = oTable.getColumns();
			var data = that.getModel("TimeData").getData();
			for (var s = 0; s < aggr.length; s++) {
				var oCells = aggr[s].getCells();
				var sTitle = aggr[s].getCells()[1].getText();
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

				}
				that.getModel("TimeData").refresh();
				oTable.removeItem(aggr[s]);
			}

		},
		formatDateMMMDD: function (oDate) {
			var month = oDate.getMonth();
			var day = oDate.getDate();

			var dateString = this.getResourceBundle().getText("month_" + month) + " " + day;

			return dateString;
		},
		formatTime: function (oTime) {
			var timeString; //NOTE 2356935
			/**
			 * @ControllerHook Modify the format of the time
			 * This hook method can be used to chnage the format of the time from HH:MM to decimals
			 * It is called while it is changing the format.
			 * @callback hcm.mytimesheet.view.S3~extHookChangeFormatTime
			 * @param {object}  Object
			 * @return {object} Object
			 */
			if (this.extHookChangeFormatTime) {
				timeString = this.extHookChangeFormatTime(oTime); //NOTE 2408036
			} else {
				var mins = oTime * 60;
				var h = Math.floor(mins / 60).toString();
				if (h.length === 1) {
					h = "0" + h;
				}
				var m = (mins % 60).toFixed(0);
				if (m.length === 1) {
					m = "0" + m;
				}
				timeString = h + ":" + m;
			}
			return timeString;
		},
		formatMobileTime: function (oTime) {
			var timeString; //NOTE 2356935
			/**
			 * @ControllerHook Modify the format of the time
			 * This hook method can be used to chnage the format of the time from HH:MM to decimals
			 * It is called while it is changing the format.
			 * @callback hcm.mytimesheet.view.S3~extHookChangeFormatTime
			 * @param {object}  Object
			 * @return {object} Object
			 */
			if (this.extHookChangeFormatTime) {
				timeString = this.extHookChangeFormatTime(oTime); //NOTE 2408036
			} else {
				var mins = oTime * 60;
				var h = Math.floor(mins / 60).toString();
				if (h.length === 1) {
					h = "0" + h;
				}
				var m = (mins % 60).toFixed(0);
				if (m.length === 1) {
					m = "0" + m;
				}
				timeString = h + "." + m;
			}
			return timeString;
		},
		timeToDecimal1: function (oTime) {
			var arr = oTime.split('.');
			if (arr[0] === "") {
				arr[0] = 0; // - to handle :45 scenerio, where no value is present befor :
			}
			//45 minutes is 45 minutes * (1 hour / 60 minutes) = 45/60 hours = 0.75 hours
			var hrs = parseInt(arr[0], 10);
			var mins = 0;
			if (arr.length > 1) {
				mins = parseFloat((arr[1]) * (1 / 60));
			}
			return parseFloat(hrs + mins);
			//return parseFloat(parseInt(arr[0], 10) + '.' + parseInt((arr[1] / 6) * 10, 10));
		},
		timeToDecimal: function (oTime) {
			var arr = oTime.split(':');
			if (arr[0] === "") {
				arr[0] = 0; // - to handle :45 scenerio, where no value is present befor :
			}
			//45 minutes is 45 minutes * (1 hour / 60 minutes) = 45/60 hours = 0.75 hours
			var hrs = parseInt(arr[0], 10);
			var mins = 0;
			if (arr.length > 1) {
				mins = parseFloat((arr[1]) * (1 / 60));
			}
			return parseFloat(hrs + mins);
			//return parseFloat(parseInt(arr[0], 10) + '.' + parseInt((arr[1] / 6) * 10, 10));
		},
		timeToDecimal2: function (oTime) {
			var arr = oTime.split(':');
			if (arr[0] === "") {
				arr[0] = 0; // - to handle :45 scenerio, where no value is present befor :
			}
			//45 minutes is 45 minutes * (1 hour / 60 minutes) = 45/60 hours = 0.75 hours
			var hrs = parseInt(arr[0], 10);
			var mins = 0;
			if (arr.length > 1) {
				mins = parseFloat((arr[1]) * (1 / 100));
			}
			return parseFloat(hrs + mins);
			//return parseFloat(parseInt(arr[0], 10) + '.' + parseInt((arr[1] / 6) * 10, 10));
		},
		adjustTime: function (val) {
			var returnVal = val;
			if (returnVal === "") {
				returnVal = "0";
			} else {
				returnVal = this.timeToDecimal(returnVal);
			}
			returnVal = parseFloat(returnVal, 10);
			returnVal = this.formatTime(returnVal.toFixed(2));

			return returnVal;
		},
		mobileTimeToDecimal: function (oTime) {
			var arr = oTime.toString().split('.');
			if (arr[0] === "") {
				arr[0] = 0; // - to handle :45 scenerio, where no value is present befor :
			}
			//45 minutes is 45 minutes * (1 hour / 60 minutes) = 45/60 hours = 0.75 hours
			var hrs = parseInt(arr[0], 10);
			var mins = 0;
			if (arr.length > 1) {
				mins = parseFloat((arr[1]) * (1 / 60));
			}
			return parseFloat(hrs + mins);
			//return parseFloat(parseInt(arr[0], 10) + '.' + parseInt((arr[1] / 6) * 10, 10));
		},
		mobileAdjustTime: function (val) {
			var returnVal = val;
			if (returnVal === "") {
				returnVal = "0";
			} else {
				returnVal = this.mobileTimeToDecimal(returnVal);
			}
			returnVal = parseFloat(returnVal, 10);
			returnVal = this.formatMobileTime(returnVal.toFixed(2));

			return returnVal;
		},
		getPreviousWeekDate: function (date) {
			var previousweek = new Date(date.getTime() - 7 * 24 * 60 * 60 * 1000);
			return previousweek;
		},
		getFirstDayOfWeek: function (date, from) {
			var index = from;
			var start = index >= 0 ? index : 1;
			var d = new Date(date);
			var day = d.getDay();
			var diff = d.getDate() - day + (start > day ? start - 7 : start);
			d.setDate(diff);
			return d;
		},
		getLastDayOfWeek: function (date, from) {
			var index = from;
			var start = index >= 0 ? index : 1;
			var d = new Date(date);
			var day = d.getDay();
			var diff = d.getDate() - day + (start > day ? start - 1 : 6 + start);
			d.setDate(diff);
			return d;
		},
		calendarSelection: function (oCalendar, startDate, endDate) {
			oCalendar.destroySelectedDates();
			var selectedDates = new sap.ui.unified.DateRange();
			selectedDates.setStartDate(startDate);
			selectedDates.setEndDate(endDate);
			oCalendar.addSelectedDate(selectedDates);
		},
		getActualOffset: function (firstDayOffset, currentDay) {
			var constantOffset = 7;
			if (firstDayOffset > currentDay) {
				return currentDay + constantOffset - firstDayOffset;
			} else {
				return currentDay - firstDayOffset;
			}
		},
		/**
		 * Convenience method for accessing the router.
		 * @public
		 * @returns {sap.ui.core.routing.Router} the router for this component
		 */
		getRouter: function () {
			return sap.ui.core.UIComponent.getRouterFor(this);
		},

		/**
		 * Convenience method for getting the view model by name.
		 * @public
		 * @param {string} [sName] the model name
		 * @returns {sap.ui.model.Model} the model instance
		 */
		getModel: function (sName) {
			return this.getView().getModel(sName);
		},

		/**
		 * Convenience method for setting the view model.
		 * @public
		 * @param {sap.ui.model.Model} oModel the model instance
		 * @param {string} sName the model name
		 * @returns {sap.ui.mvc.View} the view instance
		 */
		setModel: function (oModel, sName) {
			return this.getView().setModel(oModel, sName);
		},

		setPernr: function (oPernr) {
			var oModel = new sap.ui.model.json.JSONModel();
			oModel.setData(oPernr);
			this.getOwnerComponent().setModel(oModel, "Pernr");
		},
		getPernr: function () {
			var oModel = this.getOwnerComponent().getModel("Pernr");
			return oModel;
		},
		getGlobalModel: function (sName) {
			return this.getOwnerComponent().getModel(sName);
		},
		setGlobalModel: function (oModel, sName) {
			return this.getOwnerComponent().setModel(oModel, sName);
		},
		initoDataModel: function (oModel) {
			oDataModel = oModel;
		},
		initoBundle: function (oModel) {
			oBundle = oModel;
		},
		initPernr: function (pernr) {
			oPernr = pernr;
		},
		initRouter: function (router) {
			oRouter = router;
		},
		getoRouter: function () {
			return oRouter;
		},
		getInitPernr: function () {
			return oPernr;
		},
		getoDataModel: function () {
			return oDataModel;
		},
		getoBundle: function () {
			return oBundle;
		},

		/**
		 * Getter for the resource bundle.
		 * @public
		 * @returns {sap.ui.model.resource.ResourceModel} the resourceModel of the component
		 */
		getResourceBundle: function () {
			return this.getOwnerComponent().getModel("i18n").getResourceBundle();
		},

		_getComponent: function () {
			return this.getOwnerComponent();
		},

		getService: function () {
			return this._getComponent().service;
		},

		// getRouter: function () {
		// 	return this._getComponent().getRouter();
		// },
		// getModel: function (oModel) {
		// 	return this._getComponent().getModel(oModel);

		// },

		getText: function (sKey, aArray) {
			var _aArray = aArray;
			if (!_aArray) {
				_aArray = [];
			}
			return this.getOwnerComponent().getModel("i18n").getResourceBundle().getText(sKey, _aArray);
		},

		getPernrModel: function () {
			return this._getComponent().getModel("PernrModel");
		},
		getEmpDetailModel: function () {
			return this._getComponent().getModel("EmpDetailModel");
		},
		getDisplayModel: function () {
			return this._getComponent().getModel("DisplayModel");
		},
		getEditModel: function () {
			var oModel = this._getComponent().getModel("EditModel");
			//	oModel.setDefaultBindingMode("OneWay");
			return oModel;
		},
		getOriginalModel: function () {
			var oModel = this._getComponent().getModel("OriginalModel");
			oModel.setDefaultBindingMode("OneWay");
			return oModel;
		},
		getHomeWorkCreateModel: function () {
			return this._getComponent().getModel("HomeWorkCreateModel");
		},
		getSpecialModel: function () {
			return this._getComponent().getModel("SpecialDatesModel");
		},
		getLegendModel: function () {
			return this._getComponent().getModel("LegendModel");
		},
		getPropertyModel: function () {
			return this._getComponent().getModel("ViewProperties");
		},
		getTypesModel: function () {
			return this._getComponent().getModel("TypesModel");
		},
		getErrorHandler: function () {
			return this._getComponent().errorHandler;
		},
		// check Comments/Reason Mandatory or not in time entries		
		getComReasonMandatory: function (wbsValue, status) {
			let bCheckMandate = {
				Comments: false,
				ChReason: false
			};
			let bConfigWbsCmntMndt;
			let bConfigCommentVisible = this.getModel("controls").getProperty("/commentsVisibility");
			let bConfigCommentMandate = this.getModel("controls").getProperty("/commentsMandatory");
			let bChReasonMandate = this.getModel("controls").getProperty("/changeReasonVisibility") && this.getModel("controls").getProperty("/changeReasonMandatory");
			let aWorkListData = this.getModel("Worklist").getData();
			let aRowConfigCommentMandate;
			if (bChReasonMandate && (status === '30' || status === '40')) {
				bCheckMandate.ChReason = true;
			}
			aRowConfigCommentMandate = aWorkListData.find(function (entry, id) {
				return entry.WorkListDataFields.POSID === wbsValue;
			});
			if (aRowConfigCommentMandate) {
				bConfigWbsCmntMndt = aRowConfigCommentMandate.WorkListDataFields.Comments;
			}
			if (bConfigCommentVisible && (bConfigCommentMandate || bConfigWbsCmntMndt === 'X' || status === '30')) {
				bCheckMandate.Comments = true;
			}
			return bCheckMandate;
		},

		// Added this function for Copy Previous Week entries as part of CTS-57
		deleteCopiedEntriesModel: function () {
			let aPLT = this.getModel("controls").getProperty("/copiedDelPosID");
			if (aPLT) {
				let posID = aPLT.split(",")[0];
				let wrkloc = aPLT.split(",")[1];
				let timeCat = aPLT.split(",")[2];

				if (this.getModel("TimeEntriesCopy")?.getData()?.length) {
					let aCopiedEntries = this.getModel("TimeEntriesCopy").getData();
					for (let i = 0; i < aCopiedEntries.length; i++) {
						aCopiedEntries[i].TimeEntries.results.forEach((row,idx) => {
							if (row.TimeEntryDataFields.POSID === posID) {
								aCopiedEntries[i].TimeEntries.results.splice(idx, 1);
							}
						});
					}
				}

			}
		}
		// Added this function for Copy Previous Week entries as part of CTS-57
	});

});