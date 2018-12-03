/**
 * Google related utils.
 * Depends upon:
 * - https://apis.google.com/js/api.js: auth and picker
 * - https://apis.google.com/js/client.js: drive and request
 */
var dwv = dwv || {};
/** @namespace */
dwv.google = dwv.google || {};
// external
var gapi = gapi || {};
var google = google || {};

/**
* Google Authentification class.
* Allows to authentificate to google services.
*/
dwv.google.Auth = function ()
{
    // closure to self
    var self = this;
    // immediate mode: behind the scenes token refresh
    var immediate = false;

    // The Client ID obtained from the Google Developers Console. Replace with your own Client ID.
    this.clientId = "739581003000-7rts1aa1a2he7ifkbaev273r50fvieah.apps.googleusercontent.com";
    // The scope to use to access user's Drive items.
    this.scope = 'https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/drive.file';

    /**
    * Load the API and authentify.
    */
    this.load = function () {
        immediate = false;
    	gapi.load('client:auth2', self.onApiLoad);
    };

    /**
     * Load the API and authentify silently.
     */
     this.loadSilent = function () {
         immediate = true;
    	 gapi.load('client:auth2', self.onApiLoad);
     };

    /**
    * Called if the authentification is successful.
    * Default does nothing. No input parameters.
    */
    this.onload = function () {};

    /**
    * Callback to be overloaded.
    * Default does nothing. No input parameters.
    */
    this.onfail = function () {};

    /**
    * Authentificate.
    */
    this.onApiLoad = function() {
        // see https://developers.google.com/api-client-library/...
        //   ...javascript/reference/referencedocs#gapiauthauthorizeparams
    	gapi.client.setApiKey("");
        gapi.auth2.authorize({
            'client_id': self.clientId,
            'scope': self.scope,
            'immediate': immediate,
            'response_type': 'id_token permission'
            },
            handleResult
        );
    };

    /**
    * Launch callback if all good.
    * @param {Object} authResult An OAuth 2.0 Token Object.
    * See https://developers.google.com/api-client-library/...
    *   ...javascript/reference/referencedocs#OAuth20TokenObject
    */
    function handleResult(authResult) {
        if (authResult && !authResult.error) {
            self.onload();
        }
        else {
            self.onfail();
        }
    }
};

/**
* Google Picker class.
* Allows to create a picker and handle its result.
*/
dwv.google.Picker = function ()
{
    // closure to self
    var self = this;

    /**
    * Load API and create picker.
    */
    this.load = function () {
        gapi.load('picker', {'callback': onApiLoad});
    };

    /**
    * Called after user picked files.
    * @param {Array} ids The list of picked files ids.
    */
    this.onload = null;

    /**
    * Create the picker.
    */
    function onApiLoad() {
        //var view = new google.picker.View(google.picker.ViewId.DOCS);
        //view.setMimeTypes("application/dicom");
    	
    	var view = new google.picker.DocsView(); // [MNK]
    	view.setIncludeFolders(true);
    	view.setMimeTypes('application/vnd.google-apps.folder');
    	view.setSelectFolderEnabled(true);
    	
        // see https://developers.google.com/picker/docs/reference#PickerBuilder
        var picker = new google.picker.PickerBuilder()
            .enableFeature(google.picker.Feature.NAV_HIDDEN)
            //.enableFeature(google.picker.Feature.MULTISELECT_ENABLED)
            .setOAuthToken(gapi.auth.getToken().access_token)
            .addView(view)
            .setCallback(handleResult)
            .build();
        picker.setVisible(true);
    }

    /**
    * Launch callback if all good.
    * @param {Object} data The data returned by the picker.
    * See https://developers.google.com/picker/docs/results
    */
    function handleResult(data) {
        if (data.action === google.picker.Action.PICKED &&
            data.docs.length !== 0 ) {
            var ids = [];
            for (var i = 0; i < data.docs.length; ++i) {
                ids[ids.length] = data.docs[i].id;
            }
            self.onload(ids);
        }
    }
};

/**
* Google Drive class.
* Allows to request google drive for file download links from a list of file ids.
*/
dwv.google.Drive = function ()
{
    // closure to self
    var self = this;
    // list of ids
    var idList = null;

    // The Browser API key obtained from the Google Developers Console.
    this.apiKey = 'AIzaSyCzFQT-l9u1_Q4x-fw3dtDNZigfNivKlvg';

    /**
    * Set the ids to ask for download link.
    * @param {Array} ids The list of file ids to ask for download link.
    */
    this.setIds = function (ids) {
        idList = ids;
    };

    /**
    * Get the ids to ask for download link.
    */
    this.getIds = function () {
        return idList;
    };

    /**
    * Load API and query drive for download links.
    * @param {Array} ids The list of file ids to ask for download link.
    */
    this.loadIds = function (ids) {
        self.setIds(ids);
        self.load();
    };

    /**
    * Load API and query drive for download links.
    * The ids to ask for have been provided via the setIds.
    */
    this.load = function () {
        // set the api key
        gapi.client.setApiKey(self.apiKey);

        var func = createApiLoad(self.getIds());
        gapi.client.load('drive', 'v2', func);
    };

    /**
    * Called after drive response with the file urls.
    * @param {Array} urls The list of files urls corresponding to the input ids.
    */
    this.onload = null;

    /**
    * Create an API load handler.
    * @param {Array} ids The list of file ids to ask for download link.
    */
    function createApiLoad(ids) {
        var f = function () { onApiLoad(ids); };
        return f;
    }

    /**
    * Run the drive request.
    * @param {Array} ids The list of file ids to ask for download link.
    */
    function onApiLoad(ids) {
        // group requests in batch (ans stay bellow quotas)
        var batch = gapi.client.newBatch();

        for (var i = 0; i < ids.length; ++i) {
            // Can't make it work, HTTPRequest sends CORS error...
            // see https://developers.google.com/drive/v3/reference/files/get
            //var request = gapi.client.drive.files.get({
            //    'fileId': fileId, 'fields': 'webViewLink'
            //});

            // File path with v2??
            // see https://developers.google.com/api-client-library/...
            //   ...javascript/reference/referencedocs#gapiclientrequestargs
            //var request = gapi.client.request({
                //'path': '/drive/v2/files/' + ids[i],
                //'method': 'GET'
            //});
            
            var request = gapi.client.drive.files.list({
                q : "'" + ids[i] + "' in parents and mimeType = 'application/dicom'"
            });

            // add to batch
            batch.add(request);
        }

        // execute the batch
        batch.execute( handleDriveLoad );
    }
    
    function fetchFiles(ids) {
    	var batch = gapi.client.newBatch();
    	
    	for (var i = 0; i < ids.length; ++i) {
    		var request = gapi.client.request({
    			'path': '/drive/v2/files/' + ids[i],
    			'method': 'GET'
    		});
    		// add to batch
    		batch.add(request);
    	}
    	// execute the batch
    	batch.execute( handleFilesLoad );
    }
    
    function handleFilesLoad(resp) {
    	var urls = [];
    	var respKeys = Object.keys(resp);
    	for (var i = 0; i < respKeys.length; ++i) {
            urls[urls.length] = resp[respKeys[i]].result.downloadUrl;
    	}
    	// call onload
    	self.onload(urls);
    }

    /**
    * Launch callback when all queries have returned.
    * @param {Object} resp The batch request response.
    * See https://developers.google.com/api-client-library/...
    *   ...javascript/reference/referencedocs#gapiclientRequestexecute
    */
    function handleDriveLoad(resp) { // TODO [MNK: handle multi page response]
        var ids = [];
        // ID-response map of each requests response
        var respKeys = Object.keys(resp);
        for ( var i = 0; i < respKeys.length; ++i ) {
        	var files = resp[respKeys[i]].result.items;
        	for (var f = 0; f < files.length; ++f) {
        		ids.push(files[f].id);
        	}
        }
        fetchFiles(ids);
    }
};

/**
 * Append authorized header to the input callback arguments.
 * @param {Function} callback The callback to append headers to.
 */
dwv.google.getAuthorizedCallback = function (callback) {
    var func = function (urls) {
        //see https://developers.google.com/api-client-library/javascript/features/cors
        var header = {
            "name": "Authorization",
            "value": "Bearer " + gapi.auth.getToken().access_token
        };
        callback(urls, [header]);
    };
    return func;
};

/**
 * GoogleDriveLoad gui.
 * @constructor
 */
dwv.gui.GoogleDriveLoad = function (app)
{
    /**
     * Setup the gdrive load HTML to the page.
     */
    this.setup = function()
    {
    	// behind the scenes authentification to avoid popup blocker
        var gAuth = new dwv.google.Auth();
        gAuth.loadSilent();

        // associated div
        var gdriveLoadDiv = document.createElement("div");
        gdriveLoadDiv.className = "gdrivediv";
        gdriveLoadDiv.style.display = "none";

        // node
        var node = app.getElement("loaderlist");
        // append
        node.appendChild(gdriveLoadDiv);
        // refresh
        dwv.gui.refreshElement(node);
    };

    /**
     * Display the file load HTML.
     * @param {Boolean} bool True to display, false to hide.
     */
    this.display = function (bool)
    {
    	// gdrive div element
        var node = app.getElement("loaderlist");
        var filediv = node.getElementsByClassName("gdrivediv")[0];
        filediv.style.display = bool ? "" : "none";

        if (bool) {
            // jquery mobile dependent
            $("#popupOpen").popup("close");
            app.resetLoadbox();

            var gAuth = new dwv.google.Auth();
            var gPicker = new dwv.google.Picker();
            var gDrive = new dwv.google.Drive();
            // pipeline
            gAuth.onload = gPicker.load;
            gPicker.onload = gDrive.loadIds;
            gDrive.onload = dwv.google.getAuthorizedCallback(app.loadURLs);
            // launch
            gAuth.load();
        }
    };
};
