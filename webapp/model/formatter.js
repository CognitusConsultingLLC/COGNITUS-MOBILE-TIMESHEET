sap.ui.define([], function () {
	"use strict";

	return {
		commentDisplay: function (longtext, rejReason) {
			var dispText;
			this.oBundle = this.getModel("i18n").getResourceBundle();
			if (longtext) {
				dispText = longtext;
			}
			if (rejReason) {
				if (dispText !== undefined) {
					dispText = dispText + "\n\n" + this.oBundle.getText("rejReason") + ":\n" + rejReason;
				} else {
					dispText = this.oBundle.getText("rejReason") + ":\n" + rejReason;
				}
			}
			return dispText;
		},
		IconTooltip: function (sValue) {
			if (sValue) {
				var oBundle = this.getModel("i18n").getResourceBundle();
				var sText = "";
				if (sValue === "10") {
					sText = oBundle.getText("timeMissing");
					//	icon="sap-icon://alert";
				} else if (sValue === "20") {
					sText = oBundle.getText("timePending");
					//	icon="sap-icon://process"
				} else if (sValue === "30") {
					sText = oBundle.getText("timeCompleted");
					//	icon="sap-icon://message-success"
				} else if (sValue === "40") {
					sText = oBundle.getText("timeRejected");
					//	icon="sap-icon://decline"
				}
			}
			return sText;
		},
		IconDisplay: function (sValue) {
			if (sValue) {
				var icon = "";
				if (sValue === "10") {
					icon = "sap-icon://alert";
				} else if (sValue === "20") {
					icon = "sap-icon://process"
				} else if (sValue === "30") {
					icon = "sap-icon://message-success"
				} else if (sValue === "40") {
					icon = "sap-icon://decline"
				}
			}
			return icon;
		},
		colorDisplay: function (sValue) {
			if (sValue) {
				var icon = "";
				if (sValue === "10") {
					icon = "#FFA500";
				} else if (sValue === "20") {
					icon = "#0a6ed1"
				} else if (sValue === "30") {
					icon = "#FFFFFF"
				} else if (sValue === "40") {
					icon = "#F62217"
				}
			}
			return icon;
		},
		formatToBackendString: function (oDate) {
			if (typeof oDate !== "object") {
				oDate = new Date(oDate);
			}
			var year = oDate.getUTCFullYear();
			var month = oDate.getUTCMonth() + 1;
			var day = oDate.getUTCDate();
			if (day < 10) {
				day = '0' + day;
			}
			if (month < 10) {
				month = '0' + month;
			}
			return year + '-' + month + '-' + day;
		},

		getUTCDate: function (date) {
			if (date) {
				return new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
			}

		},

		/**
		 * Rounds the number unit value to 2 digits
		 * @public
		 * @param {string} sValue the number string to be rounded
		 * @returns {string} sValue with 2 digits rounded
		 */
		numberUnit: function (sValue) {
			if (!sValue) {
				return "";
			}
			return parseFloat(sValue).toFixed(2);
		},

		visibility: function (sValue) {
			if (sValue == 'X') {
				return true;
			} else {
				return false;
			}
		},
		hoursformat: function (sValue) {
			if (!sValue) {
				return "00:00";
			} else {
				//return sValue;
				// Commented the above line of code as part of CTS-86
				return sValue.indexOf(".") > -1 ? sValue.replace(".", ":") : sValue;
			}
		},
		status: function (sValue) {
			this.oBundle = this.getModel("i18n").getResourceBundle();
			if (sValue == '10') {
				return this.oBundle.getText('InProcess');
			} else if (sValue == '20') {
				return this.oBundle.getText('Submitted');
			} else if (sValue == '30') {
				return this.oBundle.getText('Approved');
			} else if (sValue == '40') {
				return this.oBundle.getText('Rejected');
			} else if (sValue == '100') {
				return this.oBundle.getText('allStatus');
			} else {
				return this.oBundle.getText('noentry');
			}

		},
		buttonEnabled: function (sValue, sValue2) {
			if (sValue == '30' && sValue2 == "") {
				return false;
			} else {
				return true;
			}
		},
		isNavEnabled: function (sValue, sValue2) {
			var aWorkListData = this.getModel("Worklist").getData();
			var aRow = aWorkListData.find(function (entry, id) {
				return entry.WorkListDataFields.POSID === sValue2;
			});
			if (aRow) {
				if (sValue == '30') {
					return false;
				} else {
					return true;
				}
			}
			else {
				return false;
			}
		},
		// Added the following function as part of CTS-57 for TECO information
		isMsgStripVisible: function (sValue) {
			if (sValue === undefined) {
				return false;
			}
			let aWorkListData = this.getModel("Worklist").getData();
			let aRow = aWorkListData?.find(function (entry, id) {
				return entry.WorkListDataFields.POSID === sValue;
			});
			if (aRow) { return false; }
			else { return true; }
		},
		isControlEnabled: function (sValueConfig, sValue) {
			if (sValueConfig) {
				var aWorkListData = this.getModel("Worklist").getData();
				var aRow = aWorkListData.find(function (entry, id) {
					return entry.WorkListDataFields.POSID === sValue;
				});
				if (aRow) {
					return true;
				} else {
					return false;
				}
			}
			else {
				return sValueConfig;
			}
		},
		buttonEnableMain: function (bVal) {
			if (bVal) {
				return false;
			} else {
				return true;
			}
		},
		state: function (sValue) {
			if (sValue == '10') {
				return 'Warning';
			} else if (sValue == '20') {
				return 'Information';
			} else if (sValue == '30') {
				return 'Success';
			} else if (sValue == '40') {
				return 'Error';
			} else {
				return 'None';
			}
		},
		dateString: function (sValue) {
			this.oFormatYyyymmdd = sap.ui.core.format.DateFormat.getInstance({
				pattern: "yyyy-MM-dd",
				calendarType: sap.ui.core.CalendarType.Gregorian
			});
			return String(this.oFormatYyyymmdd.format(sValue));
		},
		dateString3: function (sValue) {
			this.oFormatYyyymmdd = sap.ui.core.format.DateFormat.getInstance({
				pattern: "dd/MM/yyyy",
				calendarType: sap.ui.core.CalendarType.Gregorian
			});
			return String(this.oFormatYyyymmdd.format(sValue));
		},
		dateString2: function (sValue) {
			this.oFormatYyyymmdd = sap.ui.core.format.DateFormat.getInstance({
				pattern: "ddMMyyyy",
				calendarType: sap.ui.core.CalendarType.Gregorian
			});
			return String(this.oFormatYyyymmdd.format(sValue));
		},
		dateStringFormat: function (sValue) {
			this.oFormatYyyymmdd = sap.ui.core.format.DateFormat.getInstance({
				pattern: "EEEE, MMMM d",
				calendarType: sap.ui.core.CalendarType.Gregorian
			});
			return String(this.oFormatYyyymmdd.format(sValue));
		},
		dateStringFormat3: function (sValue) {
			this.oFormatYyyymmdd = sap.ui.core.format.DateFormat.getInstance({
				pattern: "EE, MMMM d yyyy",
				calendarType: sap.ui.core.CalendarType.Gregorian
			});
			return String(this.oFormatYyyymmdd.format(sValue));
		},
		dateStringFormat2: function (sValue) {
			// var dateString = new Date(sValue.match(/\d+/)[0] * 1);
			this.oFormatddMMMyyyy = sap.ui.core.format.DateFormat.getInstance({
				pattern: "dd MMM, yyyy",
				calendarType: sap.ui.core.CalendarType.Gregorian
			});
			return String(this.oFormatddMMMyyyy.format(sValue));
		},
		dateStringFormat2View: function (sValue) {
			return new Date(sValue.match(/\d+/)[0] * 1);
		},
		hoursValidation: function (recorded, target) {
			if (parseInt(recorded) < parseInt(target)) {
				return "Warning";
			} else if (parseInt(recorded) == 0 && parseInt(target) == 0) {
				return "None";
			} else if (parseInt(recorded) >= parseInt(target)) {
				return "Success";
			}
		},
		concatStrings: function (recorded, target) {
			return recorded + " / " + target;
		},
		mobconcatStrings: function (target, recorded) {
			this.oBundle = this.getModel("i18n").getResourceBundle();
			var oMissing = (parseFloat(target) - parseFloat(recorded)) > parseFloat(0) ? (parseFloat(target) - parseFloat(recorded)) : parseFloat(
				0);
			return this.oBundle.getText("mobMissingHours", [parseFloat(oMissing).toFixed(2)]);
		},
		concatDates: function (dateFrom, dateTo) {
			return dateFrom + "-" + dateTo;
		},
		formatToBackendString: function (oDate) {
			if (typeof oDate !== "object") {
				oDate = new Date(oDate);
			}
			var year = oDate.getFullYear();
			var month = oDate.getMonth() + 1;
			var day = oDate.getDate();
			if (day < 10) {
				day = '0' + day;
			}
			if (month < 10) {
				month = '0' + month;
			}
			return year + '-' + month + '-' + day;
		},
		TodoState: function (status) {
			if (status == "40") {
				return "Error";
			} else {
				return "Warning";
			}
		},
		switchVisibility: function (status) {
			if (status) {
				return true;
			} else {
				return false;
			}
		},
		switchState: function (oValue) {
			if (typeof oValue === 'boolean') {
				return oValue;
			} else {
				return false;
			}
		},
		returnEditedTaskValue: function (FieldName) {
			var data = this.getModel('EditedTask').getData();
			return data[FieldName];
		},
		longtextButtons: function (sValue) {
			if (sValue == 'X') {
				return "sap-icon://notification-2";
			} else {
				return "sap-icon://write-new-document";
			}
		},
		getItems: function (sValue) {
			if (sap.ui.Device.system.phone === true) {
				return "{path:'TimeData>/', sorter: { path: 'TimeEntryDataFields/WORKDATE', descending:false, group: true  }, groupHeaderFactory:'.getGroupHeader'}";
			} else {
				return "{path:'TimeData>/', sorter: { path: 'TimeEntryDataFields/WORKDATE', descending:false, group: false  }, groupHeaderFactory:'.getGroupHeader'}";
			}
		},
		activeTasks: function (sValue) {
			if (sValue === "1") {
				return true;
			} else {
				return false;
			}
		},
		checkHrRecord: function (status, hoursDisabled) {
			if (status == '99') {
				return false;
			} else {
				if (hoursDisabled) {
					return false;
				} else {
					return true;
				}

			}
		},
		dayOfWeek: function (sValue) {
			switch (sValue) {
				case "SUNDAY":
					return 0;
				case "MONDAY":
					return 1;
				case "TUESDAY":
					return 2;
				case "WEDNESDAY":
					return 3;
				case "THURSDAY":
					return 4;
				case "FRIDAY":
					return 5;
				case "SATURDAY":
					return 6;
				default:
					return 0;
			}
		},
		formatTime: function (oTime) {
			var timeParser = sap.ui.core.format.DateFormat.getTimeInstance({
				pattern: "HHmm"
			});
			var timeFormatter = sap.ui.core.format.DateFormat.getTimeInstance({
				style: "short"
			});
			if (oTime === "000000") {
				return "00:00";
			}
			oTime = timeParser.parse(oTime);
			oTime = timeFormatter.format(oTime);
			return oTime;
		},
		formatWeekHoursTime: function (sTime) {
			if (!sTime) return "";

			var parts = sTime.toString().split(".");
			var hour = parseInt(parts[0], 10);
			var minute = parseInt(parts[1] || "0", 10);

			// Pad with leading zeros
			var formattedTime = (hour < 10 ? "0" + hour : hour) + ":" + (minute < 10 ? "0" + minute : minute);
			return formattedTime;
		},
		convertTime: function (oTime) {
			var timeFormat = sap.ui.core.format.DateFormat
				.getTimeInstance({
					pattern: "HHmmss"
				});
			return timeFormat.format(oTime);
		},
		concatTimeStrings: function (startTime, endTime) {
			var timeParser = sap.ui.core.format.DateFormat.getTimeInstance({
				pattern: "HHmm"
			});
			var timeFormatter = sap.ui.core.format.DateFormat.getTimeInstance({
				style: "short"
			});
			startTime = timeParser.parse(startTime);
			startTime = timeFormatter.format(startTime);
			endTime = timeParser.parse(endTime);
			endTime = timeFormatter.format(endTime);
			if (startTime === endTime) {
				return "00:00" + " - " + "00:00";
			} else {
				return startTime + " - " + endTime;
			}

		},
		assignmentState: function (state) {
			if (state === true) {
				return sap.ui.core.ValueState.Success;
			} else {
				return sap.ui.core.ValueState.Error;
			}
		},
		assignmentName: function (oAssignment, oAssignmentId, Counter) {
			if (oAssignmentId !== "" && parseFloat(oAssignmentId).toFixed(2) !== parseFloat("0.0000000").toFixed(2)) {
				return oAssignment;
			} else if (((oAssignmentId === "" || parseFloat(oAssignmentId).toFixed(2) === parseFloat("0.0000000").toFixed(2)) && Counter !== "")) {
				return this.oBundle.getText('noAssignment');
			} else {
				return oAssignment;
			}
		},
		projectsVisible: function (cpr_guid, cpr_objguid) {
			if (cpr_guid === "" && cpr_objguid === "") {
				return false;
			} else {
				return true;
			}

		},
		getUnitTexts: function (key, hours) {
			if (this.getModel("UNIT")) {
				var data = this.getModel("UNIT").getData();
				var text;
				this.oBundle = this.getModel("i18n").getResourceBundle();
				if (key !== "" && key !== "H") {
					var obj = $.grep(data, function (element, index) {
						return element.DispField1Id === key;
					});
					if (obj.length > 0) {
						text = obj[0].DispField1Val;

					}
				} else {
					if (key === "H" && parseInt(hours) > 1) {
						text = this.oBundle.getText("hours");
					} else if (parseInt(hours) == 1) {
						text = this.oBundle.getText("hour");
					} else {
						text = this.oBundle.getText("hours");
					}
				}

				return text;
			}

		},
		formatText: function () {

		},
		assignmentstatus: function (status) {
			return status === true ? this.oBundle.getText('activeStatus') : this.oBundle.getText('inactiveStatus');
		},
		typeKind: function (oType) {
			switch (oType) {
				case "C":
					return sap.m.InputType.Text;
				case "N":
					return sap.m.InputType.Number;
				default:
					return sap.m.InputType.Text;
			}

		},
		fieldLength: function (oLength, oType) {
			if (oLength !== undefined && oLength !== null) {
				switch (oType) {
					case "C":
						return parseInt(oLength);
					case "N":
						return parseInt(oLength);
					case "D":
						return parseInt(oLength);
					default:
						return parseInt(oLength);
				}

			} else {
				return 0;
			}
		},
		getTexts: function (oFieldName, oFieldValue) {
			var oModel = this.getModel(oFieldName);
			var data;
			var text;
			if (oModel) {
				data = oModel.getData();
				if (data) {
					text = $.grep(data, function (element, index) {
						return element.DispField1Id === oFieldValue;
					});
					if (text.length > 0) {
						if (oFieldName === "APPROVER") {
							return text[0].DispField2Val;
						} else {
							return text[0].DispField1Val;
						}

					} else {
						return oFieldValue;
					}
				} else {
					return oFieldValue;
				}
			} else {
				return oFieldValue;
			}

		},
		isSelected: function (status) {
			var a = status;
			return status;
		},
		calHoursQuanAmount: function (catsHours, catsQuantity, catsAmount) {
			var numberFormat = sap.ui.core.format.NumberFormat.getFloatInstance({
				maxFractionDigits: 2
			});
			var numberFormatQuan = sap.ui.core.format.NumberFormat.getFloatInstance({
				maxFractionDigits: 3
			});
			if (parseFloat(catsHours).toFixed(2) === parseFloat("0.00").toFixed(2) && parseFloat(catsQuantity).toFixed(2) === parseFloat("0.00").toFixed(
				2) && parseFloat(catsAmount).toFixed(2) === parseFloat("0.00").toFixed(2)) {
				return numberFormat.format(catsHours);
			} else if (parseFloat(catsHours).toFixed(2) !== parseFloat("0.00").toFixed(2) && parseFloat(catsQuantity).toFixed(2) === parseFloat(
				"0.00").toFixed(
					2) && parseFloat(catsAmount).toFixed(2) === parseFloat("0.00").toFixed(2)) {
				return numberFormat.format(catsHours);
			} else if (parseFloat(catsHours).toFixed(2) === parseFloat("0.00").toFixed(2) && parseFloat(catsQuantity).toFixed(2) !== parseFloat(
				"0.00").toFixed(
					2) && parseFloat(catsAmount).toFixed(2) === parseFloat("0.00").toFixed(2)) {
				return numberFormatQuan.format(catsQuantity);
			} else if (parseFloat(catsHours).toFixed(2) === parseFloat("0.00").toFixed(2) && parseFloat(catsQuantity).toFixed(2) === parseFloat(
				"0.00").toFixed(
					2) && parseFloat(catsAmount).toFixed(2) === parseFloat("0.00").toFixed(2)) {
				return numberFormat.format(catsAmount);
			} else if (parseFloat(catsHours).toFixed(2) !== parseFloat("0.00").toFixed(2) && parseFloat(catsQuantity).toFixed(2) !== parseFloat(
				"0.00").toFixed(
					2) && parseFloat(catsAmount).toFixed(2) === parseFloat("0.00").toFixed(2)) {
				return numberFormat.format(catsHours);
			} else if (parseFloat(catsHours).toFixed(2) === parseFloat("0.00").toFixed(2) && parseFloat(catsQuantity).toFixed(2) !== parseFloat(
				"0.00").toFixed(
					2) && parseFloat(catsAmount).toFixed(2) !== parseFloat("0.00").toFixed(2)) {
				return numberFormat.format(catsAmount);
			} else if (parseFloat(catsHours).toFixed(2) !== parseFloat("0.00").toFixed(2) && parseFloat(catsQuantity).toFixed(2) === parseFloat(
				"0.00").toFixed(
					2) && parseFloat(catsAmount).toFixed(2) !== parseFloat("0.00").toFixed(2)) {
				return numberFormat.format(catsHours);
			} else {
				return numberFormat.format(catsHours);
			}

		},
		copyButtonVisible: function (bVal) {
			if (bVal) {
				//if (sap.ui.Device.system.phone !== true && bVal) {
				return true;
			} else {
				return false;
			}
		},
		// calHoursQuanAmountInput: function (catsHours, catsQuantity, catsAmount) {
		// 	// var numberFormat = sap.ui.core.format.NumberFormat.getFloatInstance({
		// 	//  maxFractionDigits: 2
		// 	// });
		// 	// var numberFormatQuan = sap.ui.core.format.NumberFormat.getFloatInstance({
		// 	//  maxFractionDigits: 3
		// 	// });
		// 	var catsHours = parseFloat(catsHours).toFixed(2);
		// 	var catsAmount = parseFloat(catsAmount).toFixed(2);
		// 	var catsQuantity = parseFloat(catsQuantity).toFixed(2);
		// 	var zero = parseFloat("0.00").toFixed(2);
		// 	if (catsHours === zero && catsQuantity === parseFloat("0.00").toFixed(
		// 		2) && parseFloat(catsAmount).toFixed(2) === zero) {
		// 		return catsHours;
		// 	} else if (parseFloat(catsHours).toFixed(2) !== zero && parseFloat(catsQuantity).toFixed(2) === zero &&
		// 		parseFloat(catsAmount).toFixed(2) === zero) {
		// 		return catsHours;
		// 	} else if (parseFloat(catsHours).toFixed(2) === zero && parseFloat(catsQuantity).toFixed(2) !== zero &&
		// 		parseFloat(catsAmount).toFixed(2) === zero) {
		// 		return catsQuantity;
		// 	} else if (parseFloat(catsHours).toFixed(2) === zero && parseFloat(catsQuantity).toFixed(2) === zero &&
		// 		parseFloat(catsAmount).toFixed(2) === zero) {
		// 		return catsAmount;
		// 	} else if (parseFloat(catsHours).toFixed(2) !== zero && parseFloat(catsQuantity).toFixed(2) !== zero &&
		// 		parseFloat(catsAmount).toFixed(2) === zero) {
		// 		return catsHours;
		// 	} else if (parseFloat(catsHours).toFixed(2) === zero && parseFloat(catsQuantity).toFixed(2) !== zero &&
		// 		parseFloat(catsAmount).toFixed(2) !== zero) {
		// 		return catsAmount;
		// 	} else if (parseFloat(catsHours).toFixed(2) !== zero && parseFloat(catsQuantity).toFixed(2) === zero &&
		// 		parseFloat(catsAmount).toFixed(2) !== zero) {
		// 		return catsHours;
		// 	} else {
		// 		return catsHours;
		// 	}

		// },
		calHoursQuanAmountInput: function (catsHours, catsQuantity, catsAmount) {
			// var numberFormat = sap.ui.core.format.NumberFormat.getFloatInstance({
			//  maxFractionDigits: 2
			// });
			// var numberFormatQuan = sap.ui.core.format.NumberFormat.getFloatInstance({
			//  maxFractionDigits: 3
			// });
			var catsHours = catsHours === undefined || !isNaN(catsHours) ? "0.00" : catsHours;//parseFloat(catsHours).toFixed(2);
			var catsAmount = catsAmount === undefined || !isNaN(catsAmount) ? "0.00" : catsAmount;//parseFloat(catsAmount).toFixed(2);
			var catsQuantity = catsQuantity === undefined || !isNaN(catsQuantity) ? "0.00" : catsQuantity;//parseFloat(catsQuantity).toFixed(2);

			var zero = "0.00";//parseFloat("0.00").toFixed(2);
			if (catsHours === zero && catsQuantity === parseFloat("0.00").toFixed(
				2) && parseFloat(catsAmount).toFixed(2) === zero) {
				return catsHours.replace(".", ":");
			} else if (parseFloat(catsHours).toFixed(2) !== zero && parseFloat(catsQuantity).toFixed(2) === zero &&
				parseFloat(catsAmount).toFixed(2) === zero) {
				return catsHours.replace(".", ":");
			} else if (parseFloat(catsHours).toFixed(2) === zero && parseFloat(catsQuantity).toFixed(2) !== zero &&
				parseFloat(catsAmount).toFixed(2) === zero) {
				return catsQuantity.replace(".", ":");
			} else if (parseFloat(catsHours).toFixed(2) === zero && parseFloat(catsQuantity).toFixed(2) === zero &&
				parseFloat(catsAmount).toFixed(2) === zero) {
				return catsAmount.replace(".", ":");
			} else if (parseFloat(catsHours).toFixed(2) !== zero && parseFloat(catsQuantity).toFixed(2) !== zero &&
				parseFloat(catsAmount).toFixed(2) === zero) {
				return catsHours.replace(".", ":");
			} else if (parseFloat(catsHours).toFixed(2) === zero && parseFloat(catsQuantity).toFixed(2) !== zero &&
				parseFloat(catsAmount).toFixed(2) !== zero) {
				return catsAmount.replace(".", ":");
			} else if (parseFloat(catsHours).toFixed(2) !== zero && parseFloat(catsQuantity).toFixed(2) === zero &&
				parseFloat(catsAmount).toFixed(2) !== zero) {
				return catsHours.replace(".", ":");
			} else {
				return catsHours.replace(".", ":");
			}

		}

	};

});