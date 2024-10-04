function updateSchedule() {

        var strJSON = '';
        let workforceInstance = new platformClient.WorkforceManagementApi();

        workforceInstance.getWorkforcemanagementAgentsMeManagementunit()
            .then((muData) => {
                console.log(`getWorkforcemanagementAgentsMeManagementunit success! data: ${JSON.stringify(muData, null, 2)}`);
                myMuID = muData.managementUnit.id;
                var sMU = document.getElementById('selectMu');
                if (sMU != undefined)
                    sMU.value = myMuID;

                myBuID = muData.businessUnit.id;
                var sBU = document.getElementById('selectBu');
                if (sBU != undefined)
                    sBU.value = myBuID;


                var dStartWeek = getMonday(new Date());
                var dToday = new Date();
                dToday.setHours(0, 0, 0, 0);
                let weekId = formatDate(dStartWeek, 'yyyy-MM-dd'); // String | First day of schedule week in yyyy-MM-dd format, or 'recent' (without quotes) to get recent schedules
                let opts = {
                    "includeOnlyPublished": true
                };

                // Get the list of week schedules for the specified week
                workforceInstance.getWorkforcemanagementBusinessunitWeekSchedules(myBuID, weekId, opts)
                    .then((schedulesData) => {
                        console.log(`getWorkforcemanagementBusinessunitWeekSchedules success! data: ${JSON.stringify(schedulesData, null, 2)}`);

                        for (var i = 0; i < schedulesData.entities.length; i++) {
                            let body = {
                                managementUnitId: myMuID,
                                userIds: [document.getElementById("selectAgent").value]
                            };
                            let opts = {};

                            // Loads agent schedule data from the schedule. Used in combination with the metadata route
                            workforceInstance.postWorkforcemanagementBusinessunitWeekScheduleAgentschedulesQuery(myBuID, schedulesData.entities[i].weekDate, schedulesData.entities[i].id, body, opts)
                                .then((agentData) => {
                                    console.log(`postWorkforcemanagementBusinessunitWeekScheduleAgentschedulesQuery success! data: ${JSON.stringify(agentData, null, 2)}`);
                                    var modifiedShift = null;

                                    for (var j = 0; j < agentData.result.agentSchedules.length; j++) {
                                        for (var k = 0; k < agentData.result.agentSchedules[j].shifts.length; k++) {
                                            var shiftDate = new Date(agentData.result.agentSchedules[j].shifts[k].startDate);
                                            shiftDate.setHours(0, 0, 0, 0);
                                            if (shiftDate.getTime() == dToday.getTime()) {


                                                agentData.result.agentSchedules[j].shifts[k].manuallyEdited = true;
                                                modifiedShift = agentData.result.agentSchedules[j].shifts[k];

                                                console.log(`agentShift: ${JSON.stringify(agentData.result.agentSchedules[j].shifts[k], null, 2)}`);

                                                shiftDate.setHours(6, 0, 0, 0);
                                                var shiftStartTime = new Date(agentData.result.agentSchedules[j].shifts[k].activities[0].startDate);
                                                const timeInput = document.querySelector('input[type="time"]');
                                                const desiredStartTime = new Date();
                                                desiredStartTime.setHours(timeInput.value.split(':')[0]);
                                                desiredStartTime.setMinutes(timeInput.value.split(':')[1]);
                                                desiredStartTime.setSeconds(0);
                                                desiredStartTime.setMilliseconds(0);
                                                var deltaMinutes = (desiredStartTime - shiftStartTime) / (1000 * 60);


                                                for (var m = 0; m < agentData.result.agentSchedules[j].shifts[k].activities.length; m++) {
                                                    var shiftTime = new Date(agentData.result.agentSchedules[j].shifts[k].activities[m].startDate);
                                                    shiftTime.setMinutes(shiftTime.getMinutes() + deltaMinutes);
                                                    agentData.result.agentSchedules[j].shifts[k].activities[m].startDate = shiftTime.toISOString();
                                                }
                                            }
                                        }
                                    }

                                    var uploadData = {};
                                    uploadData.metadata = {};
                                    uploadData.metadata.version = schedulesData.entities[0].metadata.version;
                                    uploadData.metadata.modifiedBy = {};
                                    uploadData.metadata.modifiedBy.id = myAgentID;
                                    const rightNow = new Date();
                                    uploadData.metadata.dateModified = rightNow.toISOString();
                                    uploadData.agentSchedules = [{}];
                                    uploadData.agentSchedules[0].userId = agentData.result.agentSchedules[0].user.id;
                                    uploadData.agentSchedules[0].shifts = [{}];
                                    uploadData.agentSchedules[0].shifts[0].id = modifiedShift.id;
                                    uploadData.agentSchedules[0].shifts[0].manuallyEdited = true;
                                    uploadData.agentSchedules[0].shifts[0].activities = modifiedShift.activities;
                                    uploadData.agentSchedules[0].fullDayTimeOffMarkers = [];
                                    uploadData.agentSchedules[0].metadata = {};
                                    uploadData.agentSchedules[0].metadata.version = agentData.result.agentSchedules[0].metadata.version;
                                    uploadData.agentSchedules[0].metadata.dateModified = rightNow.toISOString();
                                    uploadData.agentSchedules[0].metadata.modifiedBy = {};
                                    uploadData.agentSchedules[0].metadata.modifiedBy.id = myAgentID;

                                    var jsonRes = JSON.stringify(uploadData);

                                    var jsonData = {
                                        "json": jsonRes
                                    };
                                    $.ajax({
                                        type: "POST",
                                        url: "/Adjust Schedule?handler=GetLength",
                                        data: jsonData,
                                        contentType: 'application/x-www-form-urlencoded',
                                        crossDomain: true,
                                        headers: {
                                            "RequestVerificationToken": $('input:hidden[name="__RequestVerificationToken"]').val()
                                        },
                                        success: function (nLength) {
                                            console.log(`postGetLength success! data: ${JSON.stringify(nLength, null, 2)}`);

                                            var body = { "contentLengthBytes": nLength };
                                            workforceInstance.postWorkforcemanagementBusinessunitWeekScheduleUpdateUploadurl(myBuID, weekId, schedulesData.entities[0].id, body)
                                                .then((dataUp) => {
                                                    console.log(`postWorkforcemanagementBusinessunitWeekScheduleUpdateUploadurl success! data: ${JSON.stringify(dataUp, null, 2)}`);
                                                    var theData = {
                                                        "buId": myBuID,
                                                        "muId": myMuID,
                                                        "tagging": dataUp.headers["x-amz-tagging"],
                                                        "url": dataUp.url,
                                                        "json": jsonRes
                                                    };
                                                    $.ajax({
                                                        type: "POST",
                                                        url: "/Adjust Schedule?handler=Put",
                                                        data: theData,
                                                        contentType: 'application/x-www-form-urlencoded',
                                                        crossDomain: true,
                                                        headers: {
                                                            "RequestVerificationToken": $('input:hidden[name="__RequestVerificationToken"]').val()
                                                        },
                                                        success: function (r) {
                                                            console.log(`postPUT success! data: ${JSON.stringify(r, null, 2)}`);

                                                            let body = { "uploadKey": dataUp.uploadKey }; // Object | body

                                                            // Starts processing a schedule update
                                                            workforceInstance.postWorkforcemanagementBusinessunitWeekScheduleUpdate(myBuID, weekId, schedulesData.entities[0].id, body)
                                                                .then((data) => {
                                                                    console.log(`postWorkforcemanagementBusinessunitWeekScheduleUpdate success! data: ${JSON.stringify(data, null, 2)}`);
                                                                })
                                                                .catch((err) => {
                                                                    console.log("There was a failure calling postWorkforcemanagementBusinessunitWeekScheduleUpdate");
                                                                    console.error(err);
                                                                });
                                                        },
                                                        error: function (XMLHttpRequest, textStatus, errorThrown) {
                                                            alert("Status: " + textStatus); alert("Error: " + errorThrown);
                                                        }
                                                    });
                                                })
                                                .catch((err) => {
                                                    console.log("There was a failure calling postWorkforcemanagementBusinessunitWeekShorttermforecastsImportUploadurl");
                                                    console.error(err);
                                                });
                                        }
                                    });
                                })
                                .catch((err) => {
                                    console.log("There was a failure calling postWorkforcemanagementBusinessunitWeekScheduleAgentschedulesQuery");
                                    console.error(err);
                                });
                        }
                    })
                    .catch((err) => {
                        console.log("There was a failure calling getWorkforcemanagementBusinessunitWeekSchedules");
                        console.error(err);
                    });

            })
            .catch((err) => {
                console.log('There was a failure calling getWorkforcemanagementAgentsMeManagementunit');
                console.error(err);
            });
        
