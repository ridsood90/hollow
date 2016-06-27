function ServerCycleSummaryTab(dashboard) {
    var cycleSummaryTab = this;
    this.cycleSummarytableWidget = null;
    this.graphWidth = 0;
    var hidableColumns = [3, 5, 6, 7];
    
    this.hideColumns = function() {
        for(var i=0; i < hidableColumns.length; i++) {
            $("table[id='id-cycle-timestamp-table']").hideColumn(hidableColumns[i]);
        }
    }
    
    this.unhideColumns = function() {
        for(var i=0; i < hidableColumns.length; i++) {
            $("table[id='id-cycle-timestamp-table']").showColumn(hidableColumns[i]);
        }
    }
    
   this.initialize = function() {
        var refFn = this;
        this.workerPublishMbps = null;
        this.stateEngineSize = null;
        this.topNodeCounts = null;
        this.statsMbps = null;
        $("#id-cycle-timestamp-div").html("");

        this.getIndexSearchQuery = function(purpose, commaSeparatedFieldNames) {
            var query = new SearchQuery();
            query.indexName = dashboard.vmsIndex;
            query.sort = "eventInfo.timestamp:desc";
            query.size = VipAddressHolder.prototype.getSummaryQuerySize();

            if(!commaSeparatedFieldNames) {
                query.fields = null;
            } else {
                query.fields = commaSeparatedFieldNames;
            }
            if (purpose == "CacheFail") {
                query.indexType = "vmsserver";
                query.add("tag:TransformCycleFailed");
            } else if (purpose == "CacheSuccess") {
                query.indexType = "vmsserver";
                query.add("tag:TransformCycleSuccess");
            } else if (purpose == "CycleInfo") {
                query.indexType = "vmsserver";
                query.add("tag:TransformCycleBegin");
            } else if (purpose == "TopNodes") {
                query.indexType = "vmsserver";
                query.add("tag:TransformInfo").add("topNodes");
            } else if (purpose == "BlobPublishFail") {
                query.indexType = "vmsserver";
                query.add("tag:BlobPlubishStatus").add("false");
            } else if (purpose == "S3Errors") {
                query.add("org.jets3t.service.S3ServiceException");
            } else if (purpose == "WorkerPublish") {
                query.indexType = "vmsserver";
                query.add("tag:PublishedBlob").add("\"netflix.vms.hollowblob." + dashboard.vipAddress + ".all.snapshot\"");
            } else if (purpose == "StateEnginePublish") {
                query.indexType = "vmsserver";
                query.add("tag:PublishedBlob").add("\"netflix.vms.hollowblob." + dashboard.vipAddress + ".all.snapshot\"").add("\"us-east-1\"");
            }  else if (purpose == "hollowPublishRegion") {
                query.add("tag:AnnouncementSuccess");
            }
            return query;
        };

        this.styleRowBackground = function(rowInfo, row, numRows) {
            this.cacheFailModel = refFn.cacheFailDAO.responseModel;
            this.s3FailModel = refFn.s3FailDAO.responseModel;
            this.cacheSuccessModel = refFn.cacheSuccessDAO.responseModel;
            this.blobStatusArrayModel = refFn.blobPublishDAO.regexSourceModel.dataModel;
            this.stateEnginePublishModel = refFn.stateEnginePublishDAO.responseModel.dataModel;
            this.hollowPublishRegionModel = refFn.hollowPublishRegionDAO.responseModel;
            // this can be expensive if too many publish failures, usually 0
            this.blobErrorMapModel = new DataOperator(this.blobStatusArrayModel).groupBy("version").inpDataModel;

            var greenColor = "#E0FFE0";
            var yellowColor = "#FFFFBD";
            var redColor = "#FF9999";
            var orangeColor = "#FFA500";
            var whiteColor = "#FFFFFF";

            var currCycle = new String(rowInfo.currentCycle);
            var rowStyle = "<tr style='background-color:#FFFFFF; color:#769d3e'>";
            var html = "";
            var cycleSuccess = false;
            var cycleFail = false;
            var publishErrors = false;

            if (this.cacheSuccessModel.rowFieldEquals("eventInfo.currentCycle", currCycle)) {
                cycleSuccess = true;
            }

            if (this.blobErrorMapModel.hasOwnProperty(currCycle)) {
                publishErrors = true;
            }

            if (this.s3FailModel.rowFieldEquals("eventInfo.currentCycle", currCycle)) {
                publishErrors = true;
            }

            if (this.cacheFailModel.rowFieldEquals("eventInfo.currentCycle", currCycle)) {
                cycleFail = true;
            }

            var hollowAnnounced = [false, false, false];
            var regions = ["us-east-1", "us-west-2", "eu-west-1"];
            hollowDisplayString = "";
            showNonAvailability = false;

            // returns filtered array
            var announceResult = this.hollowPublishRegionModel.filter("eventInfo.currentCycle", currCycle);
            if(announceResult.length > 0) {
                for(i=0;i<regions.length;i++) {
                    for(var ires = 0; ires < announceResult.length; ires++) {
                        if(announceResult[ires].message.indexOf(regions[i]) > 0) {
                            hollowAnnounced[i] = true;
                            break;
                        }
                    }
                    if(!hollowAnnounced[i]) {
                        hollowDisplayString += regions[i] + " ";
                        showNonAvailability = true;
                    }
                }
            } else {
            	// Even if no hollow publish events for a cycle are found, it means that this cycle was not announced to any regions.
            	showNonAvailability = true;
            }

            if (cycleFail) {
                html += "<td><img src='images/x.png'></td>";
            } else if (cycleSuccess) {
            	if(showNonAvailability) {
            		html += "<td><img src='images/waiting.png'></td>";
            		rowStyle = "<tr style='background-color:" + orangeColor + "; color:black'>";
            	}else {
	                html += "<td><img src='images/ok.png'></td>";
	                rowStyle = "<tr style='background-color:" + whiteColor + "; color:black'>";
            	}
            } else if (!cycleFail && !cycleSuccess) {
                if(row == 0) {
                    html += "<td><img src='images/incomplete.png'></td>";
                } else {
                    html += "<td><img src='images/restarted.png'></td>";
                }
            }

            if (publishErrors) {
                html += "<td><img src='images/x.png'></td>";
                rowStyle = "<tr style='background-color:" + yellowColor + "; color:black'>";
            } else if (!refFn.workerPublishMbps[currCycle]) {
                html += "<td><img src='images/incomplete.png'></td>";
            } else {
                html += "<td><img src='images/ok.png'></td>";
            }

            
            if(showNonAvailability) {
                html += "<td>" + hollowDisplayString +  "</td>";
            } else if (!cycleSuccess) {
                html += "<td><img src='images/incomplete.png'></td>";
            } else {
                html += ("<td> </td>");
            }

            if (!refFn.workerPublishMbps[currCycle]) {
                html += "<td style='text-align:right'><img src='images/incomplete.png'></td>";
            } else {
                html += "<td style='text-align:right'>" + refFn.workerPublishMbps[currCycle].toFixed(0) + "</td>";
                if (refFn.workerPublishMbps[currCycle] < refFn.statsMbps.mean - 2 * refFn.statsMbps.sd) {
                    rowStyle = "<tr style='background-color:" + yellowColor + "; color:black'>";
                }
            }

            var publishDataSizes = refFn.stateEngineSize;

            if (!publishDataSizes[currCycle]) {
                html += "<td style='text-align:right'><img src='images/incomplete.png'></td>";
            } else {
                var val = publishDataSizes[currCycle].toFixed(4);
                var valStr = "";
                if (val < 0) {
                    valStr = val.toString().substring(0, 5);
                } else {
                    valStr = "+" + val.toString().substring(0, 4);
                }
                if(valStr == "+0.00" || valStr == "-0.00" || valStr == "+-0.0") {
                    valStr = "";
                } else {
                    valStr = valStr + "%";
                }
                html += "<td style='text-align:right'>" + valStr + "</td>";
            }

            var topNodeCountDelta = refFn.topNodeCounts;
            var currCycleNum = Number(currCycle);
            var topNodeForCycle = topNodeCountDelta[currCycle];

            if (!topNodeCountDelta[currCycle]) {
                if(topNodeForCycle == 0) {
                    html += "<td style='text-align:right'> </td>";
                } else {
                    html += "<td style='text-align:right'><img src='images/incomplete.png'></td>";
                }
            } else {
                html += "<td style='text-align:right'>" + topNodeCountDelta[currCycle] + "</td>";
            }

            if (cycleFail) {
                rowStyle = "<tr style='background-color:" + redColor + "; color:black'>";
            }

            return {
                trow : rowStyle,
                tcols : html
            };
        };

        this.populateCycleTimeStampsTable = function() {
            refFn.computeStateEngineSize();
            refFn.computeTopNodeCounts();
            cycleSummaryTab.cycleSummarytableWidget = new ClickableTableWidget("#id-cycle-timestamp-div", "id-cycle-timestamp-table", [ "currentCycle",
                    "timestamp", "custom", "custom", "custom", "custom", "custom", "custom", "custom"], [ "Cycle id", "Time", "Success", "S3 access", 
                    "Regions lagging", "S3 upload Mbps",
                    "Snapshot change", "Topnodes change"], 0, dashboard.cycleIdSelector, refFn.styleRowBackground);
            var searchFieldModelDAO = new FieldModelSearchDAO(cycleSummaryTab.cycleSummarytableWidget, refFn.getIndexSearchQuery("CycleInfo"), [
                    "timestamp", "message", "currentCycle" ], true);
            cycleSummaryTab.cycleSummarytableWidget.endBuildTableFunc = cycleSummaryTab.hideColumns;
            searchFieldModelDAO.updateJsonFromSearch();
        };

        this.cacheFailDAO = new FieldModelSearchDAO(null, refFn.getIndexSearchQuery("CacheFail", "eventInfo.currentCycle"), [ "eventInfo.currentCycle" ],
                true);
        this.cacheSuccessDAO = new FieldModelSearchDAO(null, refFn.getIndexSearchQuery("CacheSuccess", "eventInfo.currentCycle"),
                [ "eventInfo.currentCycle" ], true);
        this.s3FailDAO = new FieldModelSearchDAO(null, refFn.getIndexSearchQuery("S3Errors", "eventInfo.currentCycle"), [ "eventInfo.currentCycle" ], true);
        this.hollowPublishRegionDAO = new FieldModelSearchDAO(null, refFn.getIndexSearchQuery("hollowPublishRegion", "eventInfo.currentCycle,message"), 
                ["eventInfo.currentCycle", "message"], true);
        var s3PublishRegex = RegexParserMapper.prototype.getBlobPublishRegexInfo();
        var s3PublishRegexInfo = ResponseModelsFactory.prototype.getModel("RegexModel", {
            sourceField : "message",
            fieldsRegex : s3PublishRegex
        });
        this.stateEnginePublishDAO = new SearchDAO(s3PublishRegexInfo, null, true);
        this.stateEnginePublishDAO.searchQuery = refFn.getIndexSearchQuery("StateEnginePublish");

        var topNodeRegex = RegexParserMapper.prototype.getTopNodesRegexInfo();
        var topNodeRegexInfo = ResponseModelsFactory.prototype.getModel("RegexModel", {
            sourceField : "message",
            fieldsRegex : topNodeRegex
        });

        this.topNodeCountDAO = new SearchDAO(topNodeRegexInfo, null, true);
        this.topNodeCountDAO.searchQuery = refFn.getIndexSearchQuery("TopNodes");

        this.fillParallelModelCaches = function() {
            var daoExecutor = new ParallelDAOExecutor(refFn.populateCycleTimeStampsTable);
            daoExecutor.add(refFn.stateEnginePublishDAO);
            daoExecutor.add(refFn.topNodeCountDAO);
            daoExecutor.add(refFn.cacheFailDAO);
            daoExecutor.add(refFn.s3FailDAO);
            daoExecutor.add(refFn.cacheSuccessDAO);
            daoExecutor.add(refFn.hollowPublishRegionDAO);
            daoExecutor.run();
        };

        this.computeStateEngineSize = function() {
            var dataop = new DataOperator(refFn.stateEnginePublishDAO.responseModel.dataModel);
            var stateEngineGroupByVersion = dataop.groupBy("version");
            refFn.stateEngineSize = stateEngineGroupByVersion.min("filesize(bytes)").prevDiff(true).inpDataModel;
        };

        this.computeTopNodeCounts= function() {
            var dataop = new DataOperator(refFn.topNodeCountDAO.responseModel.dataModel);
            var topNodes = dataop.extractField("cycleId", "topNodes");
            refFn.topNodeCounts = topNodes.prevDiff(false).inpDataModel;
        };

        this.blobPublishDAO = new RegexSearchWidgetExecutor(new EventChainingWidget(this.fillParallelModelCaches), RegexParserMapper.prototype
                .getBlobStatusRegexInfo());
        this.blobPublishDAO.searchQuery = refFn.getIndexSearchQuery("BlobPublishFail");

        this.workerPublishDAO = null;

        this.fillS3FailModel = function() {
            var workerPublishGroupByVersion = new DataOperator(refFn.workerPublishDAO.regexSourceModel.dataModel).groupBy("version");
            var workerPublishMinMbps = workerPublishGroupByVersion.min("Mbps");
            refFn.workerPublishMbps = workerPublishMinMbps.inpDataModel;
            refFn.statsMbps = workerPublishMinMbps.stats();
            refFn.blobPublishDAO.updateJsonFromSearch();
        };

        this.workerPublishDAO = new RegexSearchWidgetExecutor(new EventChainingWidget(this.fillS3FailModel), RegexParserMapper.prototype
                .getBlobPublishRegexInfo());
        this.workerPublishDAO.searchQuery = refFn.getIndexSearchQuery("WorkerPublish");
        this.workerPublishDAO.updateJsonFromSearch();
    };
}//ServerCycleSummaryTab

function createClusterName(nflxEnvironment, dataNameSpace, vipAddress) {
    var cluster = "vmstransformer-" + vipAddress + "-" + dataNameSpace;
    return cluster;
}
