function initModel() {
	var sUrl = "/sap/opu/odata/cgdc/GW_HCMFAB_TIMESHEET_MAIN_SRV/";
	var oModel = new sap.ui.model.odata.ODataModel(sUrl, true);
	sap.ui.getCore().setModel(oModel);
}