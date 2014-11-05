/*
 * ***** BEGIN LICENSE BLOCK *****
 * Version: ZPL 1.1
 *
 * The contents of this file are subject to the Zimbra Public License
 * Version 1.1 ("License"); you may not use this file except in
 * compliance with the License. You may obtain a copy of the License at
 * http://www.zimbra.com/license
 *
 * Software distributed under the License is distributed on an "AS IS"
 * basis, WITHOUT WARRANTY OF ANY KIND, either express or implied. See
 * the License for the specific language governing rights and limitations
 * under the License.
 *
 * The Original Code is: Zimbra Collaboration Suite.
 *
 * The Initial Developer of the Original Code is Zimbra, Inc.
 * Portions created by Zimbra are Copyright (C) 2005 Zimbra, Inc.
 * All Rights Reserved.
 *
 * Contributor(s): @autor Nicola Pagni <nicolap@seacom.it> Lorenzo fascì <lorenzof@seacom.it>
 *
 * ***** END LICENSE BLOCK *****
 */
 
 // ZIMLET SECTIONS: < @@INSERT , @@SHOW , @@METADATA , @@REGEXP , @@TAG, @@UTILITY >


 
/**
 * Constructor.
 */
function it_seacom_aruba_pec_handler() {}

it_seacom_aruba_pec_handler.prototype = new ZmZimletBase();
it_seacom_aruba_pec_handler.prototype.constructor = it_seacom_aruba_pec_handler;

var pec = it_seacom_aruba_pec_handler;


/** This method is called by the Zimlet framework to indicate that the zimlet it being initialized.
 */
pec.prototype.init = function() {
	this._checkAndCreateTag();
	
};

pec.prototype._updateOldMetadatapec = function() {
	if(this.getUserProperty("updateOldMetadata") == "true"){ 
		return;
	}
	//Retrieve all contacts
	var contacts = this._getContacts();
	var passphrase = this.getConfig("it_seacom_aruba_pec_passphrase");
	var options = { mode: CryptoJS.mode.ECB };
	for(cn in contacts){
		var keyValArry = [];
		for(var i = 0; i < contacts[cn].length; i++){
			var id = contacts[cn][i].id;
			var meta = contacts[cn][i].meta;
			if(typeof(meta) != "undefined"){
				// I could to have more metadata related at one contact.
				for(var j = 0; j < meta.length; j++){
					// It means that the contact hold old metadata
					if(meta[j].section == "zwc:pecZimletContactMetadata"){
						var metadata = meta[j]._attrs;
						var pecPassword = metadata.pecPassword;
						var pecLogin = metadata.pecLogin;
						var pecEmail = metadata.pecEmail;
						var pecPasswordEnc = this._encryptByTripleDES(pecPassword, passphrase, options);
						keyValArry[pecEmail] = JSON.stringify({
							pecLogin: pecLogin, 
							pecPassword: pecPasswordEnc
						});
						var currentMetaData = new ZmMetaData(appCtxt.getActiveAccount(), id);
						currentMetaData.set("pecZimletContactMetadataNew", keyValArry, null, null, null, true);
					}
				}
			}
		}
	}
	this.setUserProperty("updateOldMetadata", "true");
	this.saveUserProperties();
};
pec.prototype._getContacts = function() {
    var hostname = location.hostname;
    var protocol = location.protocol;
	// var url = protocol + "//" + hostname + "/home/" + this.getUsername() + "/contacts?fmt=json";
	var url = protocol + "//" + hostname + "/home/" + this.getUsername() + "/pecImprese?fmt=json";
	var contacts = AjxRpc.invoke(null, url, null, null, true);
	return JSON.parse(contacts.text);
};

pec.prototype._updateMetadata = function(contact) {
	var passphrase = this.getConfig("it_seacom_aruba_pec_passphrase");
	var options = { mode: CryptoJS.mode.ECB };

	if(!this._contactMetadata){
	}else{
		var pecLogin = this._contactMetadata.pecLogin;
		var pecPassword = this._contactMetadata.pecPassword;
		var pecEmail = this._contactMetadata.pecEmail;
		var pecPasswordEnc = this._encryptByTripleDES(pecPassword, passphrase, options);
		var keyValArry = [];
		keyValArry[pecEmail] = JSON.stringify({
			pecLogin: pecLogin, 
			pecPassword: pecPasswordEnc
		});
		var currentMetaData = new ZmMetaData(appCtxt.getActiveAccount(), contact.id);
		currentMetaData.set("pecZimletContactMetadataNew", keyValArry, null, null, null, true);
		this._addTag(true, contact, this._tagId);
	}
};

/** This method is called by the Zimlet framework when application toolbars are initialized.
 *
 *	@param	{ZmApp} 			app			the application				
 *	@param	{ZmButtonToolBar}	toolbar		the toolbar
 *	@param	{ZmController}		controller	the application controller
 *	@param	{string}			viewId		the view Id
 */
pec.prototype.initializeToolbar = function(app, toolbar, controller, viewId) {
	if (viewId.indexOf("CNS") != -1) {
		// Add a button toolbar in the contactView
		if (!toolbar.getButton("SHOWPECWEBMAIL")) {
			var buttonIndex = 0;
			for (var i = 0; i < toolbar.opList.length; i++) {
				if (toolbar.opList[i] == ZmOperation.VIEW_MENU) {
					buttonIndex = i + 1;
					break;
				}
			}
			// Toolbar button params
			var btnPecParams = {
				tooltip: this.getMessage("label"),
				index: buttonIndex,
				image: "pec-panelIcon"
			};		
			var btnPec = toolbar.createOp("SHOWPECWEBMAIL", btnPecParams);
			this._setMenuBtnPec(btnPec, controller);
			
			// It forces the initializing of the action menu on contacts
			controller._initializeActionMenu(viewId);
			var actionMenu = controller.getActionMenu();
			// Add an option in the action menu used for setting PEC credentials
			if (!actionMenu.getOp("SETPECCREDENTIALS")) {
				var mnPecParams = {
					text : this.getMessage("label"),
					image : "pec-panelIcon",
					enabled : true
				};
				var menuPecCredentials = actionMenu.createOp("SETPECCREDENTIALS", mnPecParams);
				this._setMenuBtnPec(menuPecCredentials, controller);
			}
		}
	}
};

/** This method is called by the Zimlet framework when application toolbars are initialized.
 *
 *	@param	{Object} 			btnPec		the button to link the PEC menu
 *	@param	{ZmController}		controller	the application controller
 */
pec.prototype._setMenuBtnPec = function(btnPec, controller) {
	var BtnPecMenuTlb = new ZmPopupMenu(btnPec);
	btnPec.setMenu(BtnPecMenuTlb);
	var showPecMailboxParams = {
		text: this.getMessage("showWebmailPEC"), 
		image: "atsign", 
		style: DwtMenuItem.CASCADE_STYLE
	};
	var showPecMailbox = BtnPecMenuTlb.createMenuItem(Dwt.getNextId(), showPecMailboxParams);
	showPecMailbox.addSelectionListener(new AjxListener(this, this._showPecToolbarListener, [controller]));
	var setPecCredentialParams = {
		text: this.getMessage("setPecCredentials"), 
		image: "Preferences", 
		style: DwtMenuItem.CASCADE_STYLE
	};
	var setPecCredential = BtnPecMenuTlb.createMenuItem(Dwt.getNextId(), setPecCredentialParams);
	setPecCredential.addSelectionListener(new AjxListener(this, this._setCredentialsListener, [controller]));
	var aboutParams = {
		text: this.getMessage("about"), 
		image: "seacom-panelIcon", 
		style: DwtMenuItem.CASCADE_STYLE
	};
	var about = BtnPecMenuTlb.createMenuItem(Dwt.getNextId(), aboutParams);
	about.addSelectionListener(new AjxListener(this, this._createAboutPage));
};

pec.prototype._createAboutPage = function(){
	var view = new DwtComposite(this.getShell()); 
	view.setSize("350", "230");
	var html = new Array();
	html.push(
		"<div class='center-holder'>",
			"<div class='center'>",
				"<p class='big'>Zimlet Aruba PEC 1.0</p>",
				"<p>powered by Seacom Srl</p>",
			"</div>",
		"</div>",
		"<div class='med center-holder'>",
			"<div class='center' id='zpm_logo'>",
			"</div>",
		"</div>",
		"<div class='med center-holder'>",
			"<p>Copyright 2014 Seacom Srl<br /><a href='http://www.seacom.it'>http://www.seacom.it</a></p>",
		"</div>"
	);
	view.getHtmlElement().innerHTML = html.join("");
	var dialog = new ZmDialog({
		title : this.getMessage("about_poweredByTitle"), 
		view : view, 
		parent : this.getShell(), 
		standardButtons : [DwtDialog.OK_BUTTON]
	});
	dialog.getButton(DwtDialog.OK_BUTTON).setImage("TasksApp");
	dialog.setButtonListener(DwtDialog.OK_BUTTON, new AjxListener(this, function() {dialog.popdown();}));
	dialog.popup(); 
}

/** Retrieve the contact obj selected
 *
 *	@param	{ZmController}	controller	the application controller
 *	@return	{ZmContact}	the contact selected
 */
pec.prototype._getContactSelected = function(controller) {
	var contacts = controller.getSelection();
	if (contacts.length != 1 ) { return null; }
	return contacts[0];
};


// INSERTION PEC CREDENTIALS MANAGEMENT @@INSERT

/** Listener for setting PEC credetials for the contact selected
 *
 *	@param	{ZmContactListController}	controller	the controller
 */
pec.prototype._setCredentialsListener = function(controller) {
	var contact = this._getContactSelected(controller);
	var postCallback = new AjxCallback(this, this._showCredentialForm, [contact]);
	this._getMetaData(contact.id, postCallback);
};

/** Show the PEC crediantial form
 *
 *	@param	{ZmContact}		contact		the contact
 */
pec.prototype._showCredentialForm = function(contact) { 
	var emailsAddresses = contact.getEmails();	
	// If the contact doesn't has any email addresses show an warning message
	if(emailsAddresses.length == 0){
		this._showWarningMsg(contact.getFullName() + " " + this.getMessage("contactEmailsNotFound"));
		return;
	}
	// Retrieve the metadata PEC saved on contact
	var metadata = this._getMetadataPec();

	this.setCredentialView = new DwtComposite(this.getShell());
	this.setCredentialView.setSize("420", "90");
	this.setCredentialView.getHtmlElement().innerHTML = this._showCredentialFormView();
	
	// Hold all contact emails addresses
	this._pecEmailSelect = new DwtSelect({parent: this.setCredentialView});
	// By default select the PEC email
	var isPecEmail = false;
	var select = flagSelected = false;
	for (var i = 0; i < emailsAddresses.length; i++) {
		if(metadata){
			for(email in metadata){
				if (emailsAddresses[i] == email) {
					if(flagSelected == false){
						select = true;
						flagSelected = true;
					}else{
						select = false;
					}
				}
			}
		}
		this._pecEmailSelect.addOption(new DwtSelectOption(
			emailsAddresses[i],
			select,
			emailsAddresses[i]
		));
	}
	
	this._pecEmailSelect.reparentHtmlElement("pecEmail");
	var pecEmailSelectListener = new AjxListener(this, this._pecEmailSelectListener, [metadata]); 
	if(emailsAddresses.length > 1){
		this._pecEmailSelect.addChangeListener(pecEmailSelectListener);
	}else{
		this._pecEmailSelect.disable();
	}
	// Input PEC Login field 
	this._pecLogin = new DwtInputField({
		parent: this.setCredentialView, 
		size: '30',
		required: true
	});
	this._pecLogin.reparentHtmlElement("pecLogin");	
	
	// Input PEC Password field 
	this._pecPassword = new DwtPasswordField({
		parent:this.setCredentialView, 
		size:'30',
		required: true
	});
	this._pecPassword.reparentHtmlElement("pecPassword");
	
	if(metadata){
		this._fillPecCredentials(metadata);
	}
	
	
	this.setCredentialDialog = new ZmDialog({
		parent: this.getShell(),
		view: this.setCredentialView,
		title: this.getMessage("setPecCredentials") + " " + contact.getFullName(),
		standardButtons: [DwtDialog.OK_BUTTON, DwtDialog.CANCEL_BUTTON]
	});
		
	var okListener = new AjxListener(this, this._credentialsDialogOkBtnListener, [contact]);
	this.setCredentialDialog.setButtonListener(DwtDialog.OK_BUTTON, okListener);
	this.setCredentialDialog.getButton(DwtDialog.OK_BUTTON).setImage("pec-panelIcon");
	this.setCredentialDialog.getButton(DwtDialog.OK_BUTTON).setText(this.getMessage("saveCredentialsBtn"));
		
	var cancelListener = new AjxListener(this, this._credentialsDialogCancelBtnListener);
	this.setCredentialDialog.getButton(DwtDialog.CANCEL_BUTTON).setImage("cancel");
	this.setCredentialDialog.setButtonListener(DwtDialog.CANCEL_BUTTON, cancelListener);
	
	this.setCredentialDialog.popup();
};

/** Change Listener for an email selector
 *
 *	@param	{Object}	metadata	the metadata PEC 
 */
pec.prototype._pecEmailSelectListener = function(metadata) {
	if(metadata){
		this._fillPecCredentials(metadata);
	}
};

/** Fill login and password fields with the saved credentials
 *
 *	@param	{Object}	metadata	the metadata PEC 
 */
pec.prototype._fillPecCredentials = function(metadata) {
	var metaEmail = metadata[this._pecEmailSelect.getValue()];
	if(typeof(metaEmail) != "undefined"){
		var pecCredentials = JSON.parse(metaEmail);
		this._pecLogin.setValue(pecCredentials.pecLogin);
		this._pecPassword.setValue(pecCredentials.pecPassword);
	}else{
		this._pecLogin.setValue("");
		this._pecPassword.setValue("");
	}
};

/** Set PEC Credentials Form CANCEL listener
 */
pec.prototype._credentialsDialogCancelBtnListener = function() {
	this._freeDialog(this.setCredentialDialog); 
	this.setCredentialView.dispose();
};

/** Set PEC Credentials Form OK listener : It saves PEC data in the contact's metadata
 *
 *	@param	{ZmContact}		contact		the contact
 */
pec.prototype._credentialsDialogOkBtnListener = function(contact) {
	var pecEmail = this._pecEmailSelect.getValue();
	var pecLogin = this._pecLogin.getValue();
	var pecPassword = this._pecPassword.getValue();
	
	// Check the mandatory fields
	if  (pecLogin == "") {
		this._showWarningMsg(this.getMessage("pecLoginNotPresent"), this._pecLogin);
		return;
	}
	if  (pecPassword == "") {
		this._showWarningMsg(this.getMessage("pecPasswordNotPresent"), this._pecPassword);
		return;
	}
	var params = {
		pecEmail: pecEmail,
		pecLogin: pecLogin,
		pecPassword: pecPassword
	};
	
	
	this._saveMetadata(contact, params, null);
	this._addTag(true, contact, this._tagId);
	this.displayStatusMessage(this.getMessage("tagAddedOk"));
	this._freeDialog(this.setCredentialDialog); 
	this.setCredentialView.dispose();
};	

/** Create the HTML for the PEC Credentials Form
 */
pec.prototype._showCredentialFormView = function() {
    var html = new Array();
    html.push(
		"<table width='100%' cellspacing='0' cellpadding='0' border='0'>",
			"<tr>",
				"<td>", this.getMessage("selectPecEmail"), "</td>",
				"<td id='pecEmail'></td>",
			"</tr>",
			"<tr>",
				"<td>", this.getMessage("pecLogin"), "</td>",
				"<td id='pecLogin'></td>",
			"</tr>",
			"<tr>",
				"<td>", this.getMessage("pecPassword"), "</td>",
				"<td id='pecPassword'></td>",
			"</tr>",	
		"</table>"
	);
    return html.join("");
};


// SHOW WEBMAIL PEC MAGAGEMENT @@SHOW

/** Listener for showing PEC-mailbox
 *
 *	@param	{ZmContactListController}	controller	the controller
 */
pec.prototype._showPecToolbarListener = function(controller) {
	var contact = this._getContactSelected(controller);
	var postCallback = new AjxCallback(this, this._showConfirmWebmailPec, [contact.getFullName(), false]);
	var callback = new AjxCallback(this, this._checkPecMetadata, [contact, postCallback]);
	this._getMetaData(contact.id, callback);
};

/** Check if metadata has been modified. If YES it save the changed metadata
 *
 *	@param	{ZmContact}		contact		the contact
 *	@param {AjxCallback} 	callback 	the callback
 */
pec.prototype._checkPecMetadata = function(contact, callback) {
	var passphrase = this.getConfig("it_seacom_aruba_pec_passphrase");
	var options = { mode: CryptoJS.mode.ECB };
	var metadata = this._getMetadataPec();
	var emailsAddrs = contact.getEmails();	
	var emailFound = false;
	var metadataEmail = null;
	var pecEncPassword = "";
	var isMetadataModified = false;
	var newKeyValArry = [];
	for(email in metadata){
		for(var i = 0; i < emailsAddrs.length; i++){
			if(in_array(email, emailsAddrs[i]) == true){
				emailFound = true;
			}
		}
		if(emailFound){
			metadataEmail = JSON.parse(metadata[email]);
			pecEncPassword = this._encryptByTripleDES(metadataEmail.pecPassword, passphrase, options);
			newKeyValArry[email] = JSON.stringify({pecLogin: metadataEmail.pecLogin, pecPassword: pecEncPassword});
			emailFound = false;
		}else{
			isMetadataModified = true;
		}
	}
	if(isMetadataModified){
		this._contactMetadata = newKeyValArry;
		this._saveMetadata(contact, null, callback);
	}else{
		callback.run();
	}
};


/** Show a confirm dialog for show or not the PEC-mailbox 
 *
 *	@param	{String}	fullName	the fullname of the contact selected
 */
pec.prototype._showConfirmWebmailPec = function(fullName, byRegExp, emailByRegExp) {
	var metadata = this._getMetadataPec();
	if (!metadata) {
		if(appCtxt.getCurrentController() == "ZmTradController"){
			this._showWarningMsg(this.getMessage("credentialNotFoundByRegExp"));
		}else{
			var title = this.getMessage("label");
			var msg = this.getMessage("credentialNotFound");
			var style = DwtMessageDialog.WARNING_STYLE;
			var buttons = [DwtDialog.YES_BUTTON, DwtDialog.NO_BUTTON];
			var errDlg = this._createMsgDialog(title, msg, buttons, style);
			var yesBtnListener = new AjxListener(this, this._confSetCredentialsPecYesListener, [errDlg]);
			errDlg.setButtonListener(DwtDialog.YES_BUTTON, yesBtnListener);
			errDlg.getButton(DwtDialog.YES_BUTTON).setImage("pec-panelIcon");
			var noBtnListener = new AjxListener(this, this._confSetCredentialsPecNoListener, [errDlg]);
			errDlg.setButtonListener(DwtDialog.NO_BUTTON, noBtnListener);
			errDlg.getButton(DwtDialog.NO_BUTTON).setImage("cancel");
			errDlg.popup();
		}
		return;
	}
	var metadataEntry = Object.size(metadata);

	if(metadataEntry > 1 && byRegExp == false){
		this._confirmWebmailPecView = new DwtComposite(this.getShell());
		this._confirmWebmailPecView.getHtmlElement().innerHTML = this._showconfirmWebmailPecView();
		this._showPecEmailSelect = new DwtSelect({parent: this._confirmWebmailPecView});
		for(email in metadata){
			this._showPecEmailSelect.addOption(new DwtSelectOption(email, true, email));	
		}
		this._showPecEmailSelect.reparentHtmlElement("selectShowPecEmailId");
		
		this._showPecEmailDialog = new ZmDialog({
			parent: this.getShell(),
			view: this._confirmWebmailPecView,
			title: "Selezionare una email PEC",
			standardButtons: [DwtDialog.OK_BUTTON, DwtDialog.CANCEL_BUTTON]
		});
		var yesBtnListener = new AjxListener(this, this._confMultiWebmailPecYesListener, [metadata]);
		this._showPecEmailDialog.setButtonListener(DwtDialog.OK_BUTTON, yesBtnListener);
		this._showPecEmailDialog.getButton(DwtDialog.OK_BUTTON).setImage("pec-panelIcon");

		var noBtnListener = new AjxListener(this, this._confMultiWebmailPecNoListener);
		this._showPecEmailDialog.setButtonListener(DwtDialog.CANCEL_BUTTON, noBtnListener);
		this._showPecEmailDialog.getButton(DwtDialog.CANCEL_BUTTON).setImage("cancel");

		this._showPecEmailDialog.popup();	
	}else{
		if(byRegExp == true){
			var pecEmailToShow = JSON.parse(metadata[emailByRegExp]);
		}else{
			for(email in metadata){
				var pecEmailToShow = JSON.parse(metadata[email]);
			}
		}
		var title = this.getMessage("label");
		var msg = this.getMessage("showPecFor") + fullName + " ?";
		var style = DwtMessageDialog.INFO_STYLE;
		var buttons = [DwtDialog.YES_BUTTON, DwtDialog.NO_BUTTON];
		var confDlg = this._createMsgDialog(title, msg, buttons, style);
		var yesBtnListener = new AjxListener(this, this._confWebmailPecYesListener, [confDlg, pecEmailToShow.pecLogin, pecEmailToShow.pecPassword]);
		confDlg.setButtonListener(DwtDialog.YES_BUTTON, yesBtnListener);
		confDlg.getButton(DwtDialog.YES_BUTTON).setImage("pec-panelIcon");
		var noBtnListener = new AjxListener(this, this._confWebmailPecNoListener, [confDlg]);
		confDlg.setButtonListener(DwtDialog.NO_BUTTON, noBtnListener);
		confDlg.getButton(DwtDialog.NO_BUTTON).setImage("cancel");
		confDlg.popup();
	}
};

pec.prototype._showconfirmWebmailPecView = function() {
	var html = new Array();
	html.push("<div id='selectShowPecEmailId'></div>");
	return html.join("");
};

pec.prototype._confMultiWebmailPecNoListener = function() {
	this._showPecEmailDialog.popdown();
	this._confirmWebmailPecView.dispose();
};

pec.prototype._confMultiWebmailPecYesListener = function(metadata) {
	var metadataPecEmail = JSON.parse(metadata[this._showPecEmailSelect.getValue()]);
	this._makeWebmailPecUrl(metadataPecEmail.pecLogin, metadataPecEmail.pecPassword);
	this._showPecEmailDialog.popdown();
	this._confirmWebmailPecView.dispose();
};

/** Confirm set PEC credentials Yes Listener
 *
 *	@param	{getYesNoMsgDialog}	dialog	the dialog
 *	@param	{String}	pecLoginthe	   	PEC login
 *	@param	{String}	pecPassword		the PEC password
 */
pec.prototype._confSetCredentialsPecYesListener = function(dialog) {
	this._setCredentialsListener(appCtxt.getCurrentController());
	dialog.popdown();
};

/** Confirm show PEC-mailbox YES Listener
 *
 *	@param	{getYesNoMsgDialog}	dialog	the dialog
 *	@param	{String}	pecLoginthe	   	PEC login
 *	@param	{String}	pecPassword		the PEC password
 */
pec.prototype._confWebmailPecYesListener = function(dialog, pecLogin, pecPassword) {
	this._makeWebmailPecUrl(pecLogin, pecPassword);
	dialog.popdown();
};

/** Confirm set PEC credentials No Listener
 *
 *	@param	{getYesNoMsgDialog}		dialog		the dialog
 */
pec.prototype._confSetCredentialsPecNoListener = function(dialog) {
    dialog.popdown();
};

/** Confirm show PEC-mailbox NO Listener
 *
 *	@param	{getYesNoMsgDialog}		dialog		the dialog
 */
pec.prototype._confWebmailPecNoListener = function(dialog) {
    dialog.popdown();
};

/** 
 *
 *	@param {String} 		param 		The payload of the request
 *	@param {AjxCallback} 	callback 	the callback
 */
pec.prototype._sendRequest = function(params, url, callback, useGet, useProxy) {
	var hdrs = new Array();
	hdrs["Content-type"] = "application/x-www-form-urlencoded";
	AjxRpc.invoke(params, url, hdrs, callback, useGet);
};

/** A utility function for encoding param will be included in the requests to eDocumento
 *
 * @param {Array} params : the list of parameters to encode
 */
pec.prototype.doParamEncoding = function(params){
	var paramsEncoded = [];
	for (var i = 0; i < params.length; i++) {
		paramsEncoded.push(AjxStringUtil.urlComponentEncode(params[i][0]) + 
			"=" + AjxStringUtil.urlComponentEncode(params[i][1]));
	}
	return paramsEncoded.join("&");
};

/* Show the PEC-mailbox on the new tab of the browser
 *
 *	@param	{String}	pecLogin		the PEC login
 *	@param	{String}	pecPassword		the PEC password
 */
pec.prototype._makeWebmailPecUrl = function(pecLogin, pecPassword) {
	var host = this.getConfig("it_seacom_aruba_pec_host");
	var customer_id = this.getConfig("it_seacom_aruba_pec_customer_id");
	var passphrase = this.getConfig("it_seacom_aruba_pec_passphrase");
	
	//	$token = urlencode(base64_encode(cifra($url, $passphrase))); 
	//	where cifra = TripleDES encrypt with mode ECB and padding Pkcs5 
	
	var querystring = "login=" + pecLogin + "&pwd=" + pecPassword + "&ts=" + new Date().getTime();

	// CryptoJS.TripleDES
	var options = { mode: CryptoJS.mode.ECB, padding: CryptoJS.pad.Pkcs7 };  //padding Pkcs5/7 (the default)
	var encTripleDES = CryptoJS.TripleDES.encrypt(querystring, CryptoJS.enc.Utf8.parse(passphrase), options);
	var encTripleDESBase64 = encTripleDES.ciphertext.toString(CryptoJS.enc.Base64);
	
	// CryptoJS.enc.Base64
	var wordArray = CryptoJS.enc.Utf8.parse(encTripleDES.ciphertext.toString(CryptoJS.enc.Base64));
	var encBase64 = CryptoJS.enc.Base64.stringify(wordArray);
	
	var token = this._urlencode(encBase64);
	
	var url = host + "/authsc/sso.php?cust=" + customer_id + "&tok=" + token;
		
	window.open(url);
};

/** Encoding a string
 *
 *	@param	{String}  str	the string ti encode
 */
pec.prototype._urlencode = function(str) {
  str = (str + '').toString();
  return encodeURIComponent(str)
    .replace(/!/g, '%21')
    .replace(/'/g, '%27')
    .replace(/\(/g, '%28')
    .
  replace(/\)/g, '%29')
    .replace(/\*/g, '%2A')
    .replace(/%20/g, '+');
};


// METADATA MANAGEMENT @@METADATA

/** Gets metadata
 *
 *	@param	{String}	key		the entry key
 *	@param	{AjxCallback}	postCallback	the post callback for managing the metadata
 */
pec.prototype._getMetaData = function(key, postCallback) {
	this._currentMetaData = new ZmMetaData(appCtxt.getActiveAccount(), key);
	var callback = new AjxCallback(this, this._handleGetMetaData, postCallback);
	this._currentMetaData.get("pecZimletContactMetadataNew", null, callback);
};


pec.prototype._getOldMetaData = function(key, postCallback) {
	this._currentMetaData = new ZmMetaData(appCtxt.getActiveAccount(), key);
	var callback = new AjxCallback(this, this._handleGetMetaData, postCallback);
	this._currentMetaData.get("pecZimletContactMetadata", null, callback);
};


/** Handles metadata
 *
 *	@param	{AjxCallback}	postCallback	the post callback for managing the metadata
 *	@param	{Object}	result		the response that hold the GetCustomMetadataResponse
 */
pec.prototype._handleGetMetaData = function(postCallback, result) {
	this._contactMetadata = null;//nullify old data
	try {
		var response = result.getResponse().BatchResponse.GetCustomMetadataResponse[0];
		if (response.meta && response.meta[0]) {
			this._contactMetadata = response.meta[0]._attrs;
		}
		if (postCallback) {
			postCallback.run();
		} else {
			return this._contactMetadata;
		}
	} catch(ex) {
		this._showWarningMsg(ex);
		return;
	}
};

/** Gets the PEC metadata
 */
pec.prototype._getMetadataPec = function() {
	var decContactMetadata = null;
	if(this._contactMetadata){
		var decContactMetadata = [];
		var options = { mode: CryptoJS.mode.ECB };
		var passphrase = this.getConfig("it_seacom_aruba_pec_passphrase");
		var decTripleDES = null;
		var pecPassword = pecLogin = "";
		for(email in this._contactMetadata){
			pecLogin = JSON.parse(this._contactMetadata[email]).pecLogin;
			pecPassword = JSON.parse(this._contactMetadata[email]).pecPassword;
			pecPassword = this._decryptByTripleDES(pecPassword, passphrase, options);
			decContactMetadata[email] = JSON.stringify({pecLogin: pecLogin, pecPassword: pecPassword});
		}
	}
	return decContactMetadata;
};

/** Save metadata
 *
 *	@param	{ZmContact}	contact		the contact
 *	@param	{Object}	params		the params to save in the contact metadata
 */
pec.prototype._saveMetadata = function(contact, params, callback) {
	this._currentMetaData = new ZmMetaData(appCtxt.getActiveAccount(), contact.id);
	var keyValArry = [];
	if(this._contactMetadata){
		var emailsAddrs = contact.getEmails();	
		var emailFound = false;
		for(email in this._contactMetadata){
			for(var i = 0; i < emailsAddrs.length; i++){
				if(in_array(email, emailsAddrs[i]) == true){
					emailFound = true;
				}
			}
			if(emailFound){
				keyValArry[email] = JSON.stringify(JSON.parse(this._contactMetadata[email]));
			}
			emailFound = false;
		}
	}
	if(params){
		var passphrase = this.getConfig("it_seacom_aruba_pec_passphrase");
		var options = { mode: CryptoJS.mode.ECB };
		var pecEncPassword = this._encryptByTripleDES(params.pecPassword, passphrase, options);
		keyValArry[params.pecEmail] = JSON.stringify({pecLogin: params.pecLogin, pecPassword: pecEncPassword});
	}
	this._currentMetaData.set("pecZimletContactMetadataNew", keyValArry, null, callback, null, true);
};

function in_array(needle, haystack)
{
    return !haystack.indexOf(needle);
}

// REGEXP EMAILS MANAGEMENT @@REGEXP

/** This method is called when a zimlet content object is clicked
 *	It shows a PEC-mailbox upon a particular regexp defined in the ZDF
 *
 *	@param	{Object}	spanElement			the enclosing span element
 *	@param	{Object}	contentObjText		the content object text
 *	@param	{array}		matchContext		the match content
 *	@param	{DwtMouseEvent}		canvas		the mouse click event
 */
pec.prototype.clicked = function(spanElement, contentObjText, matchContext, canvas) {
	var email = contentObjText.split(" ");
	this._showConfirmWebmailPecByRegExp(email);
};

/** This method is called when a context menu item is selected.
 *	It shows a PEC-mailbox upon a particular regexp defined in the ZDF
 *
 *	@param	{string}	menuItemId		the selected menu item Id
 *	@param	{Object}	spanElement		the enclosing span element
 *	@param	{string}	contentObjText	the content object text
 *	@param	{Object}	canvas			the canvas
 */
pec.prototype.menuItemSelected = function(menuItemId, spanElement, contentObjText, canvas) {
	switch (menuItemId) {
    	case "SHOWPEC": {
			var email = this._actionObject.split(" ");
			this._showConfirmWebmailPecByRegExp(email);	
			break;	
		}
	}	
};	

/** Show the confirm dialog for show the PEC-mailbox from a regExp in an email
 *
 *	@param	{string}	email	the email
 */
pec.prototype._showConfirmWebmailPecByRegExp = function(email) {
	var cn = this._getContact(this._extraxtEmail(email));
	if(!cn) {
		this._showWarningMsg(this.getMessage("concactNotFound"));
		return;
	}
	var fullname = "";
	if(typeof(cn._attrs.firstName) != 'undefined'){
		fullname += cn._attrs.firstName;
	}
	if(typeof(cn._attrs.lastName) != 'undefined'){
		if(fullname != ""){
			fullname += " ";
		}
		fullname += cn._attrs.lastName;
	}
	
	//var fullname = cn._attrs.firstName + " " + cn._attrs.lastName;
	var postCallback = new AjxCallback(this, this._showConfirmWebmailPec, [fullname, true, email[1]]);
	this._getMetaData(cn.id, postCallback);
};

/** Retrieve the email
 *
 *	@param	{string}	email	the email to extract
 *	@return {String}	the email
 */
pec.prototype._extraxtEmail = function(email) {
	return email[1].toLowerCase().replace("<", "").replace(">", ""); 
};

/** This method is called when the tool tip is popping-up.
 *
 *	@param	{Object}	spanElement		the enclosing span element
 *	@param	{string}	contentObjText	the content object text
 *	@param	{array}		matchContext	the match content
 *	@param	{Object}	canvas			the canvas
 */
pec.prototype.toolTipPoppedUp = function(spanElement, contentObjText, matchContext, canvas) {
	var email = contentObjText.split(" ");
	var cn = this._getContact(email[1].toLowerCase());
	var html = new Array();
	if(cn){
		var fullname = "";
		if(typeof(cn._attrs.firstName) != 'undefined'){
			fullname += cn._attrs.firstName;
		}
		if(typeof(cn._attrs.lastName) != 'undefined'){
			if(fullname != ""){
				fullname += " ";
			}
			fullname += cn._attrs.lastName;
		}
		html.push(
			// "<div>" + this.getMessage("clickToShowPEC") + " " + cn._attrs.firstName + " " + cn._attrs.lastName + "<br>",
			"<div>" + this.getMessage("clickToShowPEC") + " " + fullname + "<br>",
			"<div>" + this.getMessage("orRigthClick") + "</div>"
		);
	}else{
		html.push("<div>" + this.getMessage("concactNotFound") + "</div>");
	}
	canvas.innerHTML = html.join("");
};
	
/** Retrieve the attributes of a contact with this email
 *
 *	@param	{string}	email	the contact email
 */
pec.prototype._getContact = function(email) {
	var jsonObj = {SearchRequest:{_jsns:"urn:zimbraMail"}};
	jsonObj.SearchRequest.query = this._makeContactQueryString(email);
	jsonObj.SearchRequest.types = "contact";
	var contact = appCtxt.getAppController().sendRequest({jsonObj: jsonObj, noBusyOverlay: false});
	return (contact.SearchResponse.cn) ? contact.SearchResponse.cn[0] : null;
};


/** Make a query string for retrieve contacts
 *
 *	@param	{string} 	email	the contact email
 */
pec.prototype._makeContactQueryString = function(email) {
	var folderTree = appCtxt.getFolderTree();
	var folders = folderTree ? folderTree.getByType(ZmOrganizer.ADDRBOOK) : [];
	folders.sort(ZmAddrBook.sortCompare);
	this.queryFolders = "";
	for (var i = 0, count = folders.length; i < count; i++) {
		if (folders[i].link || folders[i].isRemote()) {
			this.queryFolders = "in:\"" + folders[i].name +"\"";
		}	
	}
	if (this.queryFolders != "") {
		return email + " (" + this.queryFolders + " OR is:local)";
	}	
	return email;
};


// TAG MANAGEMENT @@TAG

/** Check if the tag exists
 */
pec.prototype._checkAndCreateTag = function(){
	this._tagName = "PEC-mailbox";
    this._createTagAndStoreId();
};

/** Creates Tags and stores its id
 */
pec.prototype._createTagAndStoreId = function () {
    var tagObj = appCtxt.getActiveAccount().trees.TAG.getByName(this._tagName);
    if (!tagObj) {
        this._createTag({
            name: this._tagName,
            color: ZmOrganizer.C_RED,
            callback: new AjxCallback(this, this._handleTagCreation)
        });
    } else {
        this._tagId = tagObj.nId;
    }
};

/** Creates tags
 *
 * 	@param 	{Object} 	params 	Object that defines a tag like: name, color etc
 */
pec.prototype._createTag = function (params) {
    var soapDoc = AjxSoapDoc.create("CreateTagRequest", "urn:zimbraMail");
    var tagNode = soapDoc.set("tag");
    tagNode.setAttribute("name", params.name);
    var color = ZmOrganizer.checkColor(params.color);
    if (color && (color != ZmOrganizer.DEFAULT_COLOR[ZmOrganizer.TAG])) {
        tagNode.setAttribute("color", color);
    }
    appCtxt.getAppController().sendRequest({
        soapDoc: soapDoc,
        asyncMode: true,
        callback: params.callback
    });
};

/**
 * 	@param {Object}  response	Create Tag response
 */
pec.prototype._handleTagCreation = function (response) {
    try {
        this._tagId = response.getResponse().CreateTagResponse.tag[0].id;
    } catch (e) {}
};

/** Add tag on a contact
 *
 * 	@param 		{Boolean}  		apply tag or not
 * 	@param 		{ZmContact}  	the item which apply the tag
 * 	@param 		{String}  		the tag ID
 */
pec.prototype._addTag = function (doTag, contact, tagId) {
	if (!contact.isShared()) {
		var axnType = "";
		var type = "CONTACT";
		var axnType = (doTag) ? "tag" : "!tag"; //tag or untag
		var soapCmd = ZmItem.SOAP_CMD[type] + "Request";
		var itemActionRequest = {};
		itemActionRequest[soapCmd] = {_jsns:"urn:zimbraMail"};
		var request = itemActionRequest[soapCmd];
		var action = request.action = {};
		action.id = contact.id;
		action.op = axnType;
		action.tag = tagId;
		var params = {asyncMode: true, callback: null, jsonObj:itemActionRequest};
		appCtxt.getAppController().sendRequest(params);
	}	
};


// UTILITY FUNCTIONS @@UTILITY

pec.prototype._encryptByTripleDES = function(message, key, options) {
    var keyHex = CryptoJS.enc.Utf8.parse(key);
    var encrypted = CryptoJS.TripleDES.encrypt(message, keyHex, options);
    return encrypted.toString();
}

pec.prototype._decryptByTripleDES = function(ciphertext, key, options) {
    var keyHex = CryptoJS.enc.Utf8.parse(key);
    var decrypted = CryptoJS.TripleDES.decrypt({
        ciphertext: CryptoJS.enc.Base64.parse(ciphertext)
		}, keyHex, options);
    return decrypted.toString(CryptoJS.enc.Utf8);
}

pec.prototype._createMsgDialog = function(title, message, buttons, style) {
    var showMsgDlg = new DwtMessageDialog({
		parent: this.getShell(), 
		title: title,
		buttons: buttons
	});
    showMsgDlg.setMessage(message, style);
	return showMsgDlg;
};


pec.prototype._showWarningMsg = function(message, field) {
    if (message.length > 1000) {
        message = message.substring(0, 999) + "...";
    }
    var style = DwtMessageDialog.WARNING_STYLE;
    this.warningDialog = new DwtMessageDialog({parent: this.getShell(), buttons: [DwtDialog.OK_BUTTON]});
    this.warningDialog.setMessage(message, style);
	var okButtListener = new AjxListener(this, this._warningDialogOkBtnListener, field);
	this.warningDialog.setButtonListener(DwtDialog.OK_BUTTON, okButtListener); 
    this.warningDialog.popup();
};

//Se è specificato un campo sposta il focus
pec.prototype._warningDialogOkBtnListener = function(field) {
	this.warningDialog.popdown();
	if(field){
		field.focus;
	}
};

pec.prototype._freeDialog = function(dialog) {
    dialog.popdown();
    dialog.dispose();
};

pec.prototype._cipher = function(str, isEncode) {
	var parts = str.split( "" );
	var output = [];
	for( var i = 0; i < parts.length; ++i ) {
		var ch = parts[i];
		var chCode = ch.charCodeAt( ch );
		if(isEncode){
			var encCh = chCode + 3;
		}else{
			var encCh = chCode - 3;
		}
		var letter = String.fromCharCode( encCh );
		output.push( letter )
	}
	return output.join( "" );
};

Object.size = function(obj) {
    var size = 0, key;
    for (key in obj) {
        if (obj.hasOwnProperty(key)) size++;
    }
    return size;
};

function mostra(inobj) {
	op = window.open();
	op.document.open('text/plain');
	for (objprop in inobj) {
		op.document.write(objprop + ' => ' + inobj[objprop] + '\n');
	}
	op.document.close();
}