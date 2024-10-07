sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"cgdc/timesheet/controller/BaseController",
], function (Controller, BaseController) {

	return BaseController.extend("cgdc.timesheet.controller.ReuseFunctions", {
		getFirstDayOfWeek: function (date, from) {
			//Default start week from 'Sunday'. You can change it yourself.
			// from = from || 'Sunday';
			// var index = this.weekday.indexOf(from);
			// var index = this.weekday.indexOf(from);
			var index = from;
			var start = index >= 0 ? index : 0;
			var d = new Date(date);
			var day = d.getDay();
			var diff = d.getDate() - day + (start > day ? start - 7 : start);
			d.setDate(diff);
			return d;
		},
		calendarSelection: function (oCalendar, startDate, endDate) {
			oCalendar.destroySelectedDates();
			// for (var i = startDate; i <= endDate; i.setDate(i.getDate() + 1)) {
			//  oCalendar.set
			// }
			var selectedDates = new sap.ui.unified.DateRange();
			selectedDates.setStartDate(startDate);
			selectedDates.setEndDate(endDate);
			oCalendar.addSelectedDate(selectedDates);
		},
			getActualOffset: function(firstDayOffset, currentDay) {
				var constantOffset = 7;
				if (firstDayOffset > currentDay) {
					return currentDay + constantOffset - firstDayOffset;
				} else {
					return currentDay - firstDayOffset;
				}
			},

	});
});