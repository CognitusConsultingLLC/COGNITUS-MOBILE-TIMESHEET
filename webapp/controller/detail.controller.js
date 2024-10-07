sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"cgdc/timesheet/controller/BaseController",
	"cgdc/timesheet/model/formatter",
	'sap/ui/core/Fragment',
	"sap/ui/model/json/JSONModel"
], function (Controller, BaseController, formatter, Fragment, JSONModel) {
	"use strict";

	return BaseController.extend("cgdc.timesheet.controller.detail", {
		formatter: formatter,
		/**
		 * Called when a controller is instantiated and its View controls (if available) are already created.
		 * Can be used to modify the View before it is displayed, to bind event handlers and do other one-time initialization.
		 * @memberOf cgdc.timesheet.view.detail
		 */
		onInit: function () {
			this.oControl = this.getOwnerComponent().getModel("controls");
			this.oControl.setProperty("/overviewCancel", false);
			this.oControl.setProperty("/overviewDataChanged", false);
			this.oControl.setProperty("/sendForApproval", false);
			this.oPage = this.byId("detailpage");
			this.oFormatddMMyyyy = sap.ui.core.format.DateFormat.getInstance({
				pattern: "dd/MM/yyyy",
				calendarType: sap.ui.core.CalendarType.Gregorian
			});
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
			this.Router = this.getOwnerComponent().getRouter();
			//	var oModel = new sap.ui.model.json.JSONModel();
			//	this.getView().setModel(oModel, "aTableRowsdays");
			this.busyDialog = new sap.m.BusyDialog();
			this.oDataModel = this.getOwnerComponent().getModel();
			this.onGetLocations();
			this.onGetTimeCategories();
			this.getOwnerComponent().getRouter().getRoute("detail").attachPatternMatched(this.onRouteMatched, this);

		},
		onRouteMatched: function (oEvent) {
			this.iIndex = parseInt(oEvent.getParameters("arguments").arguments.index);
			var iFrom = oEvent.getParameters("arguments").arguments.from;
			var aMainData = this.getModel("aTableRowsMain").getData();
			if (aMainData.length) {
				var aArray = [];
				aArray.push(aMainData[this.iIndex]);
				this.getModel("aTableRowsdays").setData(aArray);
				this.getModel("aTableRowsdays").refresh();
				this.byId("detailpage").setTitle(this.getResourceBundle().getText("detailpagetitle", [this.oFormatddMMyyyy.format(new Date(
					aMainData[0].rowsdata[6].WORKDATE))]));
				this.bindList(this.iIndex);
			} else {
				this.Router.navTo("default", {});
			}
		},
		onGetLocations: function () {
			var that = this;
			var oModel = new sap.ui.model.json.JSONModel();
			var oDate = this.startdate;

			this.busyDialog.open();
			var mParameters = {
				success: function (oData, oResponse) {
					that.busyDialog.close();
					oData.results.unshift({
						OBJID: "00000000",
						STEXT: "SELECT"
					});
					oModel.setSizeLimit(oData.results.length + 50);
					oModel.setData(oData.results);
					that.getView().setModel(oModel, "AvlWorkLocations");
				},
				error: function (oError) {
					that.busyDialog.close();
					that.oErrorHandler.processError(oError);
				}
			};
			this.oDataModel.read('/VL_SH_xCGDCxSH_WRKLOC', mParameters);
		},
		onGetTimeCategories: function () {
			var that = this;
			var oModel = new sap.ui.model.json.JSONModel();

			this.busyDialog.open();

			var mParameters = {
				//filters: aFilter,
				success: function (oData, oResponse) {
					that.busyDialog.close();
					oData.results.unshift({
						TIME_CAT: "0000",
						DESCRIPTION: "SELECT"
					});
					oModel.setSizeLimit(oData.results.length + 50);
					oModel.setData(oData.results);
					that.getView().setModel(oModel, "AvlTimeCategories");
				},
				error: function (oError) {
					that.busyDialog.close();
					that.oErrorHandler.processError(oError);
				}
			};
			this.oDataModel.read('/VL_SH_xCGDCxSH_TIME_CAT', mParameters);
		},
		onMobLocationChange: function (oEvent) {
			var that = this;
			var selCountry = oEvent.getSource().getSelectedKey();
			var selTC = oEvent.getSource().getParent().getCells()[3].getSelectedKey();
			var isValid = true;
			var oRowData = this.getModel("aTableRowsdays").getData();
			var oRows = this.getModel("aTableRows").getData();
			var data = this.getModel('TimeData').getData();
			if (selCountry === "00000000") {
				sap.m.MessageToast.show("Select Location for the WBS");
				isValid = false;
			} else {
				for (var j = 0; j < oRows.length - 1; j++) {
					if (j !== this.iIndex && oRows[j].timecat === selTC && oRows[j].wrkloc === selCountry) {
						sap.m.MessageToast.show("Multiple Entries on Same WBS, Location and Time Category are not allowed");
						isValid = false;
					}
				}
			}

			if (isValid) {
				var sPosId = oRows[this.iIndex].posid;
				var sPTC = oRows[this.iIndex].timecat;
				var sWL = oRows[this.iIndex].wrkloc;
				var currIndex = this.iIndex;
				for (var k = 0; k < oRows[this.iIndex].rowsdata.length; k++) {
					var record = data.find(function (entry, id) {
						return entry.TimeEntryDataFields.POSID === sPosId && entry.TimeEntryDataFields.WrkLoc === sWL && entry.TimeEntryDataFields
							.ProjTimeCat === sPTC && that.oFormatyyyymmdd.format(entry.TimeEntryDataFields.WORKDATE) ===
							that.oFormatyyyymmdd.format(oRows[currIndex].rowsdata[k].WORKDATE);
					});
					if (record !== undefined) {
						if (record.Counter) {
							record.TimeEntryDataFields.WrkLoc = selCountry;
							record.TimeEntryDataFields.ProjTimeCat = selTC;
							record.TimeEntryOperation = 'U';
							this.oControl.setProperty("/overviewDataChanged", true);
							this.oControl.setProperty("/sendForApproval", true);
							this.getModel("TimeData").refresh();
						}
						/*else {
							record.TimeEntryOperation = 'C';
						}*/
					}

				}
				that.getModel("TimeData").refresh();
			} else {
				this.oControl.setProperty("/overviewDataChanged", false);
				this.oControl.setProperty("/sendForApproval", false);
			}
		},
		onMobTCChange: function (oEvent) {
			var that = this;
			var selCountry = oEvent.getSource().getParent().getCells()[2].getSelectedKey();
			var selTC = oEvent.getSource().getSelectedKey();
			var isValid = true;
			var oRowData = this.getModel("aTableRowsdays").getData();
			var oRows = this.getModel("aTableRows").getData();
			var data = this.getModel('TimeData').getData();

			for (var j = 0; j < oRows.length - 1; j++) {
				if (j !== this.iIndex && oRows[j].timecat === selTC && oRows[j].wrkloc === selCountry) {
					sap.m.MessageToast.show("Multiple Entries on Same WBS, Location and Time Category are not allowed");
					isValid = false;
				}
			}

			if (isValid) {
				var sPosId = oRows[this.iIndex].posid;
				var sPTC = oRows[this.iIndex].timecat;
				var sWL = oRows[this.iIndex].wrkloc;
				var currIndex = this.iIndex;
				for (var k = 0; k < oRows[this.iIndex].rowsdata.length; k++) {
					var record = data.find(function (entry, id) {
						return entry.TimeEntryDataFields.POSID === sPosId && entry.TimeEntryDataFields.WrkLoc === sWL && entry.TimeEntryDataFields
							.ProjTimeCat === sPTC && that.oFormatyyyymmdd.format(entry.TimeEntryDataFields.WORKDATE) ===
							that.oFormatyyyymmdd.format(oRows[currIndex].rowsdata[k].WORKDATE);
					});
					if (record !== undefined) {
						if (record.Counter) {
							record.TimeEntryDataFields.WrkLoc = selCountry;
							record.TimeEntryDataFields.ProjTimeCat = selTC;
							record.TimeEntryOperation = 'U';
							this.oControl.setProperty("/overviewDataChanged", true);
							this.oControl.setProperty("/sendForApproval", true);
							this.getModel("TimeData").refresh();
						}
						/*else {
							record.TimeEntryOperation = 'C';
						}*/
					}

				}
				that.getModel("TimeData").refresh();
			} else {
				this.oControl.setProperty("/overviewDataChanged", false);
				this.oControl.setProperty("/sendForApproval", false);
			}
		},
		bindList: function (iIndex) {
			var that = this;
			this.oPage.removeContent(1);
			var oTemplate = new sap.m.CustomListItem({
				type: "Navigation",
				content: [
					new sap.m.HBox({
						items: [
							new sap.m.Button({
								enabled: {
									path: 'aTableRowsdays>STATUS',
									formatter: formatter.buttonEnabled
								},
								type: "Emphasized",
								icon: "sap-icon://touch",
								press: function (oEvent) {
									that.addTimeFromButton(oEvent);
								}
							}).addStyleClass("sapUiSmallMarginBegin sapUiSmallMarginTopBottom"),
							new sap.m.VBox({
								items: [
									new sap.m.Text({
										text: {
											path: 'aTableRowsdays>WORKDATE',
											formatter: formatter.dateStringFormat3
										}
									}),
									new sap.m.Text({
										text: {
											path: 'aTableRowsdays>CATSHOURS',
											formatter: formatter.hoursformat
										}
									})
								]
							}).addStyleClass("sapUiSmallMarginBegin sapUiSmallMarginTopBottom"),
							new sap.m.ObjectStatus({
								text: {
									path: 'aTableRowsdays>STATUS',
									formatter: formatter.status
								},
								state: {
									path: 'aTableRowsdays>STATUS',
									formatter: formatter.state
								}
							}).addStyleClass("sapUiLargeMarginBegin sapUiSmallMarginTopBottom")
						]
					})

				]
			});
			var oList = new sap.m.List({
				headerText: "{i18n>timeentries}",
				itemPress: function (oEvent) {
					that.onMainTimeEntriesItemDetailPress(oEvent);
				},
				swipe: function (oEvent) {
					oEvent.preventDefault();
					that.onMainTimeEntriesItemDetailPress(oEvent);
				},
				swipeContent: [
					new sap.m.Button({
						icon: "sap-icon://accept"
					})
				]
			}).bindItems({
				path: 'aTableRowsdays>/0/rowsdata',
				template: oTemplate,
				templateShareable: false
			});
			this.oPage.addContent(oList);
		},
		onMainTimeEntriesItemDetailPress: function (oEvent) {
			var tabObj = this.getView().byId("wbsDetails");
			//tabObj.getItems()[0].getCells()[2].getSelectedKey();
			var selCountry = tabObj.getItems()[0].getCells()[2].getSelectedKey();
			var selCategory = tabObj.getItems()[0].getCells()[3].getSelectedKey();
			if (selCountry !== "00000000") {
				var sPath = oEvent.getParameters("listItem").listItem.getBindingContextPath(); // '/0/rowsdata/0'
				var iIndex = oEvent.getParameters("listItem").listItem.getBindingContextPath().split("/")[1];
				var sIndex = oEvent.getParameters("listItem").listItem.getBindingContextPath().split("/")[3];
				this.Router.navTo("detaildetail", {
					index: iIndex,
					sindex: sIndex
				});
			} else {
				sap.m.MessageToast.show("Select Location for the WBS");
			}
		},
		addTimeFromButton: function (oEvent) {
			this.butPressedItemPosid = "/" + oEvent.getSource().getParent().getParent().getBindingContextPath().split("/")[1];
			this.butPressedPath = oEvent.getSource().getParent().getParent().getBindingContextPath();
			var odata = [{
				"key": "0",
				"text": "0 Hours"
			}, {
				"key": "2",
				"text": "2 Hours"
			}, {
				"key": "4",
				"text": "4 Hours"
			}, {
				"key": "8",
				"text": "8 Hours"
			}, ];
			var oModel = new sap.ui.model.json.JSONModel();
			oModel.setData(odata);
			var oButton = oEvent.getSource(),
				oView = this.getView();

			if (!this._pPopover) {
				this._pPopover = Fragment.load({
					id: oView.getId(),
					name: "cgdc.timesheet.view.fragment.HoursPopover",
					controller: this
				}).then(function (oPopover) {
					oView.addDependent(oPopover);
					oPopover.setModel(oModel, "ListHours");
					return oPopover;
				});
			}
			this._pPopover.then(function (oPopover) {
				oPopover.openBy(oButton);
			});

		},
		onHoursItemPress: function (oEvent) {
			var that = this;
			oEvent.getSource().getParent().close();
			if (oEvent.getParameters("item").item) {
				var data = this.getModel('TimeData').getData();
				var sKey = parseFloat(oEvent.getParameters("item").item.getKey()).toFixed(2);
				var sPosid = this.getModel("aTableRowsdays").getObject(this.butPressedItemPosid).posid;
				var oDate = this.getModel("aTableRowsdays").getObject(this.butPressedPath).WORKDATE;
				this.getModel("aTableRowsdays").getObject(this.butPressedPath).CATSHOURS = sKey;
				this.getModel("aTableRowsdays").refresh();
				var oWorkListModel = this.getModel("Worklist");
				var aWorkListData = oWorkListModel.getData();
				var aRow = aWorkListData.find(function (entry, id) {
					return entry.WorkListDataFields.POSID === sPosid;
				});
				var record = data.find(function (entry, id) {
					return that.oFormatyyyymmdd.format(entry.TimeEntryDataFields.WORKDATE) === that.oFormatyyyymmdd.format(oDate);
				});
				record.TimeEntryDataFields.CATSHOURS = sKey;
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
			}
		},
		onNavBacktoDetail: function () {
			var that = this;
			if (this.oControl.getProperty("/isOverviewChanged") === true) {
				var sResponsivePaddingClasses =
					"sapUiResponsivePadding--header sapUiResponsivePadding--content sapUiResponsivePadding--footer";
				var sText = this.getResourceBundle().getText("unsavedData");
				var error = this.getResourceBundle().getText("warning");
				sap.m.MessageBox.warning(sText, {
					icon: sap.m.MessageBox.Icon.WARNING,
					title: error, // default
					styleClass: sResponsivePaddingClasses, // default
					actions: [sap.m.MessageBox.Action.OK,
						sap.m.MessageBox.Action.CANCEL
					], // default
					emphasizedAction: sap.m.MessageBox.Action.OK, // default
					onClose: function (oAction) {
						if (oAction === "OK") {
							that.Router.navTo("default", {});
						}
					}
				});
			} else {
				that.Router.navTo("default", {});
			}
		},
		onSendApproval: function (oEvent) {
			this.busyDialog.open();
			this.finalSubmit();
		},
		onSaveConfirm: function (oEvent) {
			this.busyDialog.open();
			var that = this;
			var toastMsg;
			if (this.oControl.getProperty("/isOverviewChanged") === true) {
				var entries = this.getModel('TimeData').getData();
				for (var i = 0; i < entries.length; i++) {
					entries[i].SetDraft = true;
				}
				this.finalSubmit();
			} else {
				toastMsg = that.getResourceBundle().getText("noDataChanged");
				sap.m.MessageToast.show(toastMsg, {
					//	duration: 3000
				});
				this.busyDialog.close();
				return;
			}
		},
		onCancelConfirm: function (oEvent) {
			var oControls = this.getModel("controls");
			if (oControls.getProperty("/isOverviewChanged") === true) {
				this.showConfirmBox(oEvent, this.onCancel.bind(this));
				oControls.setProperty("/isOverviewChanged", false);
			} else {
				this.onCancel();
				oControls.setProperty("/isOverviewChanged", false);
			}
			oControls.setProperty("/overviewDataChanged", false);
			sap.ui.getCore().getMessageManager().removeAllMessages();
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
			var data = {};
			var oModel = new JSONModel();
			oModel.setData(data);
			this.setModel(oModel, 'deleteRecords');
			this.setModel(oModel, 'changedRecords');
			this.setModel(oModel, 'newRecords');
			this.setModel(oControl, "controls");
			sap.ui.getCore().getMessageManager().removeAllMessages();
			this.Router.navTo("default", {});
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
			this._oDialog = sap.ui.xmlfragment(this.getView().getId(), "cgdc.timesheet.view.fragment.CancelConfirmationPopOver",
				oDialogController);
			this.getView().addDependent(this._oDialog);
			this._oDialog.openBy(oEvent.getSource());
		},
		/**
		 * Similar to onAfterRendering, but this hook is invoked before the controller's View is re-rendered
		 * (NOT before the first rendering! onInit() is used for that one!).
		 * @memberOf cgdc.timesheet.view.detail
		 */
		//	onBeforeRendering: function() {
		//
		//	},

		/**
		 * Called when the View has been rendered (so its HTML is part of the document). Post-rendering manipulations of the HTML could be done here.
		 * This hook is the same one that SAPUI5 controls get after being rendered.
		 * @memberOf cgdc.timesheet.view.detail
		 */
		//	onAfterRendering: function() {
		//
		//	},

		/**
		 * Called when the Controller is destroyed. Use this one to free resources and finalize activities.
		 * @memberOf cgdc.timesheet.view.detail
		 */
		//	onExit: function() {
		//
		//	}

	});

});