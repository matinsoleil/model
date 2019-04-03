(function(){
    OCA.Files.FileList.prototype = Object.assign({}, OCA.Files.FileList.prototype, {
        initialize: function($el, options) {
            var self = this;
            options = options || {};
            if (this.initialized) {
                return;
            }

            if (options.shown) {
                this.shown = options.shown;
            }

            if (options.config) {
                this._filesConfig = options.config;
            } else if (!_.isUndefined(OCA.Files) && !_.isUndefined(OCA.Files.App)) {
                this._filesConfig = OCA.Files.App.getFilesConfig();
            } else {
                this._filesConfig = new OC.Backbone.Model({
                    'showhidden': false
                });
            }

            if (options.dragOptions) {
                this._dragOptions = options.dragOptions;
            }
            if (options.folderDropOptions) {
                this._folderDropOptions = options.folderDropOptions;
            }
            if (options.filesClient) {
                this.filesClient = options.filesClient;
            } else {
                // default client if not specified
                this.filesClient = OC.Files.getClient();
            }

            this.$el = $el;
            if (options.id) {
                this.id = options.id;
            }
            this.$container = options.scrollContainer || $(window);
            this.$table = $el.find('table:first');
            this.$fileList = $el.find('#fileList');

            if (!_.isUndefined(this._filesConfig)) {
                this._filesConfig.on('change:showhidden', function() {
                    var showHidden = this.get('showhidden');
                    self.$el.toggleClass('hide-hidden-files', !showHidden);
                    self.updateSelectionSummary();

                    if (!showHidden) {
                        // hiding files could make the page too small, need to try rendering next page
                        self._onScroll();
                    }
                });

                this.$el.toggleClass('hide-hidden-files', !this._filesConfig.get('showhidden'));
            }


            if (_.isUndefined(options.detailsViewEnabled) || options.detailsViewEnabled) {
                this._detailsView = new OCA.Files.DetailsView();
                this._detailsView.$el.addClass('disappear');
            }

            this._initFileActions(options.fileActions);

            if (this._detailsView) {
                this._detailsView.addDetailView(new OCA.Files.MainFileInfoDetailView({fileList: this, fileActions: this.fileActions}));
            }
            this.files = [];
            this._selectedFiles = {};
            this._selectionSummary = new OCA.Files.FileSummary(undefined, {config: this._filesConfig});
            // dummy root dir info
            this.dirInfo = new OC.Files.FileInfo({});

            this.fileSummary = this._createSummary();

            if (options.multiSelectMenu) {
                this.fileMultiSelectMenu = new OCA.Files.FileMultiSelectMenu(options.multiSelectMenu);
                this.fileMultiSelectMenu.render();
                this.$el.find('.selectedActions').append(this.fileMultiSelectMenu.$el);
            }

            if (options.sorting) {
                this.setSort(options.sorting.mode, options.sorting.direction, false, false);
            } else {
                this.setSort('name', 'asc', false, false);
            }

            var breadcrumbOptions = {
                onClick: _.bind(this._onClickBreadCrumb, this),
                getCrumbUrl: function(part) {
                    return self.linkTo(part.dir);
                }
            };
            // if dropping on folders is allowed, then also allow on breadcrumbs
            if (this._folderDropOptions) {
                breadcrumbOptions.onDrop = _.bind(this._onDropOnBreadCrumb, this);
                breadcrumbOptions.onOver = function() {
                    self.$el.find('td.filename.ui-droppable').droppable('disable');
                };
                breadcrumbOptions.onOut = function() {
                    self.$el.find('td.filename.ui-droppable').droppable('enable');
                };
            }
            this.breadcrumb = new OCA.Files.BreadCrumb(breadcrumbOptions);

            var $controls = this.$el.find('#controls');
            if ($controls.length > 0) {
                $controls.prepend(this.breadcrumb.$el);
                this.$table.addClass('has-controls');
            }

            this._renderNewButton();

            this.$el.find('thead th .columntitle').click(_.bind(this._onClickHeader, this));

            // Toggle for grid view, only register once
            $('input#showgridview').removeClass('registered');
            this.$showGridView = $('input#showgridview:not(.registered)');
            this.$showGridView.on('change', _.bind(this._onGridviewChange, this));
            this.$showGridView.addClass('registered');
            $('#view-toggle').tooltip({placement: 'left', trigger: 'hover'});

            this._onResize = _.debounce(_.bind(this._onResize, this), 250);
            $('#app-content').on('appresized', this._onResize);
            $(window).resize(this._onResize);

            this.$el.on('show', this._onResize);

            this.updateSearch();

            this.$fileList.on('click','td.filename>a.name, td.filesize, td.date', _.bind(this._onClickFile, this));

            $.event.trigger({type: "droppedOnTrash"});

            var self=this;
            this.$fileList.on("droppedOnTrash", function (event, filename, directory) {
                //self.fileActions.triggerAction('Favorite', self.getModelForFile(file), self);
                self.do_delete(filename, directory)
            });

            this.$fileList.on('change', 'td.selection>.selectCheckBox', _.bind(this._onClickFileCheckbox, this));
            this.$el.on('show', _.bind(this._onShow, this));
            this.$el.on('urlChanged', _.bind(this._onUrlChanged, this));
            this.$el.find('.select-all').click(_.bind(this._onClickSelectAll, this));
            this.$el.find('.actions-selected').click(function () {
                self.fileMultiSelectMenu.show(self);
                return false;
            });

            this.$container.on('scroll', _.bind(this._onScroll, this));

            if (options.scrollTo) {
                this.$fileList.one('updated', function() {
                    self.scrollTo(options.scrollTo);
                });
            }

            if (options.enableUpload) {
                // TODO: auto-create this element
                var $uploadEl = this.$el.find('#file_upload_start');
                if ($uploadEl.exists()) {
                    this._uploader = new OC.Uploader($uploadEl, {
                        fileList: this,
                        filesClient: this.filesClient,
                        dropZone: $('#content'),
                        maxChunkSize: options.maxChunkSize
                    });

                    this.setupUploadEvents(this._uploader);
                }
            }

            OC.Plugins.attach('OCA.Files.FileList', this);
        },

        _renderRow: function (fileData, options) {
            options = options || {};
            var type = fileData.type || 'file',
                mime = fileData.mimetype,
                path = fileData.path || this.getCurrentDirectory(),
                permissions = parseInt(fileData.permissions, 10) || 0;

            var isEndToEndEncrypted = (type === 'dir' && fileData.isEncrypted);

            if (!isEndToEndEncrypted && fileData.isShareMountPoint) {
                permissions = permissions | OC.PERMISSION_UPDATE;
            }

            if (type === 'dir') {
                mime = mime || 'httpd/unix-directory';
            }
            var tr = this._createRow(
                fileData,
                options
            );
            var filenameTd = tr.find('td.filename');

            // TODO: move dragging to FileActions ?
            // enable drag only for deletable files
            if (this._dragOptions && permissions & OC.PERMISSION_DELETE) {
                this._dragOptions['containment'] = '#app-content';
                filenameTd.draggable(this._dragOptions);
            }
            // allow dropping on folders
            if (this._folderDropOptions && mime === 'httpd/unix-directory') {
                tr.droppable(this._folderDropOptions);
            }

            if (options.hidden) {
                tr.addClass('hidden');
            }

            if (this._isHiddenFile(fileData)) {
                tr.addClass('hidden-file');
            }

            // display actions
            this.fileActions.display(filenameTd, !options.silent, this);
            if (typeof(options.nopreview) === 'undefined' || !options.nopreview) {
                if (mime !== 'httpd/unix-directory' && fileData.hasPreview !== false) {
                    var iconDiv = filenameTd.find('.thumbnail');
                    // lazy load / newly inserted td ?
                    // the typeof check ensures that the default value of animate is true
                    if (typeof(options.animate) === 'undefined' || !!options.animate) {
                        this.lazyLoadPreview({
                            fileId: fileData.id,
                            path: path + '/' + fileData.name,
                            mime: mime,
                            name: fileData.name,
                            etag: fileData.etag,
                            callback: function (url) {
                                iconDiv.css('background-image', 'url("' + url + '")');
                                iconDiv.css('background-repeat', 'no-repeat');
                                iconDiv.css('background-size', FileList.$showGridView.is(':checked')?'cover':'100% 100%');
                            }
                        });
                    }
                    else {
                        // set the preview URL directly
                        var urlSpec = {
                            file: path + '/' + fileData.name,
                            c: fileData.etag
                        };
                        var previewUrl = this.generatePreviewUrl(urlSpec);
                        previewUrl = previewUrl.replace('(', '%28').replace(')', '%29');
                        iconDiv.css('background-image', 'url("' + previewUrl + '")');
                    }
                }
            }
            return tr;
        },

        appendForViewType: function(tr, file){
            if(this.$showGridView.is(':checked')){
                if(file.type === 'dir'){
                    this.$fileList.find('tr[data-type=dir]').length
                        ? this.$fileList.find('tr[data-type=dir]').last().after(tr)
                        : this.$fileList.find('.files-subtitle.for-dir').after(tr);
                }else{
                    this.$fileList.find('tr[data-type=file]').length
                        ? this.$fileList.find('tr[data-type=file]').last().after(tr)
                        : this.$fileList.find('.files-subtitle.for-file').after(tr);
                }
            }else{
                this.$fileList.append(tr);
            }
        },

        _findInsertionIndexForGridView: function(fileData) {
            var index = 0;
            var clone = this.files.slice(0);
            clone = clone.filter(function (file) { return file.type === fileData.type; });
            while (index < clone.length && this._sortComparator(fileData, clone[index]) > 0) {
                index++;
            }
            return fileData.type === 'dir' ? index : index + Math.abs(clone.length - this.files.length);
        },

        printFiles: function(files,fromGridChange) {
            if(this.$showGridView.is(':checked')){
                this.removeSubtitles();
                this.printSubtitles(files);
                files.forGridviewSort(this._sortComparator);
                this.setFiles(files, true,fromGridChange);
            }else{
                files.sort(this._sortComparator);
                this.setFiles(files,false,fromGridChange);
            }
        },

        printSubtitles: function(files){
            var hasDirs = files.some(function(file){ return file.type === 'dir'; });
            var hasFiles = files.some(function(file){ return file.type === 'file'; });
            if(hasDirs){
                this.$fileList.append('<div id="for-dir" class="files-subtitle for-dir">Carpetas</div>');
            }
            if(hasFiles){
                this.$fileList.append('<div id="for-file" class="files-subtitle for-file">Archivos</div>');
            }
        },

        removeSubtitles: function(){
            this.$fileList.find('.files-subtitle').remove();
        },

        setFiles: function(filesArray, forGridview,fromGridChange) {
            var self = this;
            // detach to make adding multiple rows faster
            this.files = filesArray;
            forGridview ? this.$fileList.find('tr').remove() : this.$fileList.empty();
            if (this._allowSelection) {
                // The results table, which has no selection column, checks
                // whether the main table has a selection column or not in order
                // to align its contents with those of the main table.
                this.$el.addClass('has-selection');
            }
            // clear "Select all" checkbox
            //this.$el.find('.select-all').prop('checked', false);

            // Save full files list while rendering
            this.isEmpty = this.files.length === 0;
            this._nextPage();
            (this._filter.length) ? this.setFilter(this._filter): (!fromGridChange)&&this.updateSearch();
            this.updateEmptyContent();

            this.fileSummary.calculate(this.files);

            if ((Object.entries(this._selectedFiles).length === 0 && this._selectedFiles.constructor === Object)){
                this._selectedFiles = {};
                this._selectionSummary.clear();
            }
            this.updateSelectionSummary();
            $(window).scrollTop(0);

            this.$fileList.trigger(jQuery.Event('updated'));
            _.defer(function() {
                self.$el.closest('#app-content').trigger(jQuery.Event('apprendered'));
            });
        },

        _onGridviewChange: function() {
            var show = this.$showGridView.is(':checked');
            // only save state if user is logged in
            if (OC.currentUser) {
                $.post(OC.generateUrl('/apps/files/api/v1/showgridview'), {
                    show: show
                });
            }
            this.$showGridView.next('#view-toggle')
                .removeClass('icon-toggle-filelist icon-toggle-pictures')
                .addClass(show ? 'icon-toggle-filelist' : 'icon-toggle-pictures')
                .attr("data-original-title",show ? t('amx_branding', "Toggle list view") : t('amx_branding', "Toggle grid view"));

            $('#view-toggle').tooltip('destroy');
            $('#view-toggle').tooltip({placement: 'left', trigger: 'hover'});
            $('#view-toggle').trigger('mouseenter');

            $('.list-container').toggleClass('view-grid', show);

            this.printFiles(this.files,true);
        },

        _nextPage: function(animate, complete) {
            complete = typeof complete !== 'undefined' ? complete : false;
            var index = this.$fileList.find('tr').length,
                count = (complete) ? this.files.length - index : this.pageSize(),
                hidden,
                tr,
                fileData,
                newTrs = [],
                isAllSelected = this.isAllSelected(),
                showHidden = this._filesConfig.get('showhidden');

            if (index >= this.files.length) {
                return false;
            }

            while (count > 0 && index < this.files.length) {
                fileData = this.files[index];
                if (this._filter) {
                    hidden = fileData.name.toLowerCase().indexOf(this._filter.toLowerCase()) === -1;
                } else {
                    hidden = false;
                }
                var renderOptions = {
                    updateSummary: false, silent: true, hidden: hidden
                };
                if (complete) {
                    renderOptions.nopreview = true;
                }
                tr = this._renderRow(fileData, renderOptions);
                this.appendForViewType(tr, fileData);
                if (isAllSelected || this._selectedFiles[fileData.id]) {
                    tr.addClass('selected');
                    tr.find('.selectCheckBox').prop('checked', true);
                }
                if (animate) {
                    tr.addClass('appear transparent');
                }
                newTrs.push(tr);
                index++;
                // only count visible rows
                if (showHidden || !tr.hasClass('hidden-file')) {
                    count--;
                }
            }

            // trigger event for newly added rows
            if (newTrs.length > 0) {
                this.$fileList.trigger($.Event('fileActionsReady', {fileList: this, $files: newTrs}));
            }

            if (animate) {
                // defer, for animation
                window.setTimeout(function() {
                    for (var i = 0; i < newTrs.length; i++ ) {
                        newTrs[i].removeClass('transparent');
                    }
                }, 0);
            }

            return newTrs;
        },

        setSort: function(sort, direction, update, persist) {
            var comparator = OCA.Files.FileList.Comparators[sort] || OCA.Files.FileList.Comparators.name;
            this._sort = sort;
            this._sortDirection = (direction === 'desc')?'desc':'asc';
            this._sortComparator = function(fileInfo1, fileInfo2) {
                var isFavorite = function(fileInfo) {
                    return fileInfo.tags && fileInfo.tags.indexOf(OC.TAG_FAVORITE) >= 0;
                };

                if (isFavorite(fileInfo1) && !isFavorite(fileInfo2)) {
                    return -1;
                } else if (!isFavorite(fileInfo1) && isFavorite(fileInfo2)) {
                    return 1;
                }

                return direction === 'asc' ? comparator(fileInfo1, fileInfo2) : -comparator(fileInfo1, fileInfo2);
            };

            this.$el.find('thead th .sort-indicator')
                .removeClass(this.SORT_INDICATOR_ASC_CLASS)
                .removeClass(this.SORT_INDICATOR_DESC_CLASS)
                .toggleClass('hidden', true)
                .addClass(this.SORT_INDICATOR_DESC_CLASS);

            this.$el.find('thead th.column-' + sort + ' .sort-indicator')
                .removeClass(this.SORT_INDICATOR_ASC_CLASS)
                .removeClass(this.SORT_INDICATOR_DESC_CLASS)
                .toggleClass('hidden', false)
                .addClass(direction === 'desc' ? this.SORT_INDICATOR_DESC_CLASS : this.SORT_INDICATOR_ASC_CLASS);
            if (update) {
                if (this._clientSideSort) {
                    //Patch for claro drive gridview
                    this.printFiles(this.files);
                }
                else {
                    this.reload();
                }
            }

            if (persist && OC.getCurrentUser().uid) {
                $.post(OC.generateUrl('/apps/files/api/v1/sorting'), {
                    mode: sort,
                    direction: direction
                });
            }
        },

        _findInsertionIndex: function(fileData) {
            if(this.$showGridView.is(':checked')) return this._findInsertionIndexForGridView(fileData);

            var index = 0;
            while (index < this.files.length && this._sortComparator(fileData, this.files[index]) > 0) {
                index++;
            }
            return index;
        },

        add: function(fileData, options) {
            var index;
            var $tr;
            var $rows;
            var $insertionPoint;
            options = _.extend({animate: true}, options || {});

            // there are three situations to cover:
            // 1) insertion point is visible on the current page
            // 2) insertion point is on a not visible page (visible after scrolling)
            // 3) insertion point is at the end of the list

            console.log(fileData.type);

            $tr = this._renderRow(fileData, options);
            
            
            if($('#fileList').find('div.files-subtitle.for-dir').attr('id')==undefined && fileData.type =="dir"){
                this.$fileList.append('<div id="for-dir" class="files-subtitle for-dir">Carpetas</div>');

            }

            if($('#fileList').find('div.files-subtitle.for-file').attr('id')==undefined && fileData.type =="file"){
                this.$fileList.append('<div id="for-file" class="files-subtitle for-file">Archivos</div>');

            }
            




            $rows = this.$fileList.children();
            index = this._findInsertionIndex(fileData);
            if (index > this.files.length) {
                console.log('1');
                index = this.files.length;
            }
            else {
                console.log('2');
                $insertionPoint = $rows.eq(index);
            }
            // is the insertion point visible ?
            if ($insertionPoint.length) {
                console.log('3');
                // only render if it will really be inserted
                $tr = this._renderRow(fileData, options);

                if(
                    this.$showGridView.is(':checked')
                    && $insertionPoint.prev().hasClass('files-subtitle')
                    && $insertionPoint.prev().attr('id') === 'for-file'
                ){
                    console.log('4');
                    if(fileData.type === 'dir'){
                        $insertionPoint = $('div.files-subtitle.for-file').prev();
                    }else{
                        console.log('5');  
                        $insertionPoint = $('div.files-subtitle.for-file');
                    }
                   
                    $insertionPoint.after($tr);
                }else{
                    console.log('6');
                    $insertionPoint.before($tr);
                }
            }
            else {

                $tr = this._renderRow(fileData, options);

                if(fileData.type === 'dir'){   
                    $insertionPoint = $('div.files-subtitle.for-dir');
                    $insertionPoint.after($tr);
                }else{
                    $insertionPoint = $('div.files-subtitle.for-file');
                    $insertionPoint.after($tr);
                }
           
            }

            this.isEmpty = false;
            this.files.splice(index, 0, fileData);

            if ($tr && options.animate) {
                console.log('9');
                $tr.addClass('appear transparent');
                window.setTimeout(function() {
                    $tr.removeClass('transparent');
                    $("#fileList tr").removeClass('mouseOver');
                    $tr.addClass('mouseOver');
                });
            }

            if (options.scrollTo) {
                this.scrollTo(fileData.name);
            }

            // defaults to true if not defined
            if (typeof(options.updateSummary) === 'undefined' || !!options.updateSummary) {
                console.log('10');
                this.fileSummary.add(fileData, true);
               
                this.updateEmptyContent();
                
            }

            

            console.log($tr);

            return $tr;
        },

        reloadCallback: function(status, result) {
            delete this._reloadCall;
            this.hideMask();

            if (status === 401) {
                return false;
            }

            // Firewall Blocked request?
            if (status === 403) {
                // Go home
                this.changeDirectory('/');
                OC.Notification.show(t('files', 'This operation is forbidden'), {type: 'error'});
                return false;
            }

            // Did share service die or something else fail?
            if (status === 500) {
                // Go home
                this.changeDirectory('/');
                OC.Notification.show(t('files', 'This directory is unavailable, please check the logs or contact the administrator'),
                    {type: 'error'}
                );
                return false;
            }
            if (status === 503) {
                // Go home
                if (this.getCurrentDirectory() !== '/') {
                    this.changeDirectory('/');
                    // TODO: read error message from exception
                    OC.Notification.show(t('files', 'Storage is temporarily not available'),
                        {type: 'error'}
                    );
                }
                return false;
            }
            if (status === 400 || status === 404 || status === 405) {
                // go back home
                this.changeDirectory('/');
                return false;
            }
            // aborted ?
            if (status === 0){
                return true;
            }
            this.updateStorageStatistics(true);

            // first entry is the root
            this.dirInfo = result.shift();
            this.breadcrumb.setDirectoryInfo(this.dirInfo);

            if (this.dirInfo.permissions) {
                this.setDirectoryPermissions(this.dirInfo.permissions);
            }
            this.printFiles(result);
            if (this.dirInfo) {
                var newFileId = this.dirInfo.id;
                // update fileid in URL
                var params = {
                    dir: this.getCurrentDirectory()
                };
                if (newFileId) {
                    params.fileId = newFileId;
                }
                this.$el.trigger(jQuery.Event('afterChangeDirectory', params));
            }
            return true;
        },

        /**
         * Event handler when leaving previously hidden state
         */
        _onShow: function(e) {
            if (this.shown) {
                if (e.itemId === this.id) {
                    this._setCurrentDir('/', false);
                }
                // Only reload if we don't navigate to a different directory
                if (typeof e.dir === 'undefined' || e.dir === this.getCurrentDirectory()) {
                    this._systemTagIds = [];
                    this.reload();
                }
                if(!$('#app-content-files').hasClass('hidden')&&this._filter!=='')this._filter = '';
            }
            if (e.itemId === 'systemtagsfilter') {
                this.$showGridView.next('#view-toggle').addClass('hidden');
            } else {
                this.$showGridView.next('#view-toggle').removeClass('hidden');
            }

            this.shown = true;
        },
        setFilter:function(filter) {
            var total = 0;
            if (this._filter === filter) {
                if(this._filter && this.$showGridView.is(':checked')) this.hideSubtitles();
                return;
            }
            this._filter = filter;
            this.fileSummary.setFilter(filter, this.files);
            total = this.fileSummary.getTotal();
            if (!this.$el.find('.mask').exists()) {
                this.hideIrrelevantUIWhenNoFilesMatch();
            }

            var visibleCount = 0;
            filter = filter.toLowerCase();

            function filterRows(tr) {
                var $e = $(tr);
                if ($e.data('file').toString().toLowerCase().indexOf(filter) === -1) {
                    $e.addClass('hidden');
                } else {
                    visibleCount++;
                    $e.removeClass('hidden');
                }
            }

            var $trs = this.$fileList.find('tr');
            do {
                _.each($trs, filterRows);
                if (visibleCount < total) {
                    $trs = this._nextPage(false);
                }
            } while (visibleCount < total && $trs.length > 0);

            this.hideSubtitles();

            this.$container.trigger('scroll');
        },
        move: function(fileNames, targetPath, callback, dir) {
            var self = this;
            var checkbox = $('#select_all_files');
            checkbox.prop("checked",false);

            dir = typeof dir === 'string' ? dir : this.getCurrentDirectory();
            if (dir.charAt(dir.length - 1) !== '/') {
                dir += '/';
            }
            var target = OC.basename(targetPath);
            if (!_.isArray(fileNames)) {
                fileNames = [fileNames];
            }

            function Semaphore(max) {
                var counter = 0;
                var waiting = [];

                this.acquire = function() {
                    if(counter < max) {
                        counter++;
                        return new Promise(function(resolve) { resolve(); });
                    } else {
                        return new Promise(function(resolve) { waiting.push(resolve); });
                    }
                };

                this.release = function() {
                    counter--;
                    if (waiting.length > 0 && counter < max) {
                        counter++;
                        var promise = waiting.shift();
                        promise();
                    }
                };
            }

            var moveFileFunction = function(fileName) {
                var $tr = self.findFileEl(fileName);
                self.showFileBusyState($tr, true);
                if (targetPath.charAt(targetPath.length - 1) !== '/') {
                    // make sure we move the files into the target dir,
                    // not overwrite it
                    targetPath = targetPath + '/';
                }
                return self.filesClient.move(dir + fileName, targetPath + fileName)
                    .done(function() {
                        // if still viewing the same directory
                        if (OC.joinPaths(self.getCurrentDirectory(), '/') === dir) {
                            // recalculate folder size
                            var oldFile = self.findFileEl(target);
                            var newFile = self.findFileEl(fileName);
                            var oldSize = oldFile.data('size');
                            var newSize = oldSize + newFile.data('size');
                            oldFile.data('size', newSize);
                            oldFile.find('td.filesize').text(OC.Util.humanFileSize(newSize));

                            // TODO: also update entry in FileList.files
                            !self._systemTagIds && self.remove(fileName);
                        }
                        self._systemTagIds && self.getModelForFile(fileName).set({'path':targetPath});
                    })
                    .fail(function(status) {
                        if (status === 412) {
                            // TODO: some day here we should invoke the conflict dialog
                            OC.Notification.show(t('files', 'Could not move "{file}", target exists',
                                {file: fileName}), {type: 'error'}
                            );
                        } else {
                            OC.Notification.show(t('files', 'Could not move "{file}"',
                                {file: fileName}), {type: 'error'}
                            );
                        }
                    })
                    .always(function() {
                        self.showFileBusyState($tr, false);
                    });
            };

            var mcSemaphore = new Semaphore(10);
            var counter = 0;
            var promises = _.map(fileNames, function(arg) {
                return mcSemaphore.acquire().then(function(){
                    moveFileFunction(arg).then(function(){
                        mcSemaphore.release();
                        counter++;
                    });
                });
            });

            return Promise.all(promises).then(function(){
                if (callback) {
                    callback();
                }
            });
        },
        hideSubtitles: function () {
            var _dirs = this.$fileList.find('tr').toArray().some(function(tr){ return !$(tr).hasClass('hidden') && $(tr).data('type') === 'dir'; });
            var _files = this.$fileList.find('tr').toArray().some(function(tr){ return !$(tr).hasClass('hidden') && $(tr).data('type') === 'file'; });
            $('.files-subtitle.for-dir').toggleClass('hidden', !_dirs);
            $('.files-subtitle.for-file').toggleClass('hidden', !_files);
        },
        getModelForFile: function(fileName) {

            var self = this;
            var $tr;
            var fileModel;
            // jQuery object ?
            if (fileName.is) {
                $tr = fileName;
                fileName = $tr.attr('data-file');
            } else {
                $tr = this.findFileEl(fileName);
            }

            if (!$tr || !$tr.length) {
                fileModel = self.createFileModel(self.files.find(function (file) {return fileName === file.name;}));
                if (!fileModel){
                    return null;
                }
            }

            // if requesting the selected model, return it
            if (this._currentFileModel && this._currentFileModel.get('name') === fileName) {
                return this._currentFileModel;
            }

            var model = new OCA.Files.FileInfoModel(($tr.length)?this.elementToFile($tr):fileModel, {
                filesClient: this.filesClient
            });
            if (!model.get('path')) {
                model.set('path', this.getCurrentDirectory(), {silent: true});
            }

            model.on('change', function(model) {
                // re-render row
                var highlightState = $tr.hasClass('highlighted');
                $tr = self.updateRow(
                    $tr,
                    model.toJSON(),
                    {updateSummary: true, silent: false, animate: true}
                );

                // restore selection state
                var selected = !!self._selectedFiles[$tr.data('id')];
                self._selectFileEl($tr, selected);

                $tr.toggleClass('highlighted', highlightState);
            });
            model.on('busy', function(model, state) {
                self.showFileBusyState($tr, state);
            });

            return model;
        },
        createFileModel: function (fileData) {
            var data = {
                id: fileData.id,
                name: fileData.name,
                mimetype: fileData.mimetype,
                mtime: parseInt(fileData.mtime, 10),
                type: fileData.type,
                etag: fileData.etag,
                permissions: fileData.permissions,
                hasPreview: fileData.hasPreview,
                isEncrypted: fileData.isEncrypted,
                sharePermissions: fileData.sharePermissions,
            };
            var size = fileData.size;
            if (size) {
                data.size = parseInt(size, 10);
            }
            var icon = fileData.icon;
            if (icon) {
                data.icon = icon;
            }
            var mountType = fileData.mountType;
            if (mountType) {
                data.mountType = mountType;
            }
            var path = fileData.path;
            if (path) {
                data.path = path;
            }
            return data;
        }
    });
})();
(function () {
    if (!Object.entries)
        Object.entries = function( obj ){
        var ownProps = Object.keys( obj ),
            i = ownProps.length,
            resArray = new Array(i); // preallocate the Array
            while (i--)
                resArray[i] = [ownProps[i], obj[ownProps[i]]];
            return resArray;
        };
})();

$(document).ready(function () {
    $.prototype._oldChildren = $.prototype.children;
    $.prototype.children = function(a){
        try{
            if(this.attr('id') === 'fileList' && FileList.$showGridView.is(':checked')){
                return this._oldChildren().not('.files-subtitle');
            }
        }catch(e){}
        return this._oldChildren(a);
    };
    $.prototype._oldIndex = $.prototype.index;
    $.prototype.index = function(a){
        try{
            if(this.parent().attr('id') === 'fileList' && FileList.$showGridView.is(':checked')){
                //return FileList.$fileList.children()._oldIndex(this);
                return $('.app-files div#app-content div[id^="app-content-"]').not('.hidden').find('#filestable #fileList').children()._oldIndex(this);
            }
        }catch(e){}
        return this._oldIndex(a);
    };

    Array.prototype.forGridviewSort = function(a) {
        this.sort(a);
        var clone = this.slice(0);
        var self = this;
        this.splice(0, this.length);
        clone.forEach(function(f){ if(f.type === 'dir') self.push(f); });
        clone.forEach(function(f){ if(f.type === 'file') self.push(f); });
    };
});
