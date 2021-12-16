let clippyAgent;
let tutorial;
let currentClippyMove = 0;
let initialPos, initialSize;

window.onload = async function() {
    await tableau.extensions.initializeAsync({'configure': configure});
    console.log("Extension is running");
    checkSettings();
    // tutorial = JSON.parse(tableau.extensions.settings.get('actions'));

};

async function configure() {
    const dialogPayload = await tableau.extensions.ui.displayDialogAsync("http://localhost:3123/clippy_config.html", '5', 
        { height: 900, width: 600 });
    checkSettings();
}

function checkSettings() {
    tutorial = JSON.parse(tableau.extensions.settings.get('actions'));
    if(tutorial.length > 0) {
        document.getElementById('playButton').src = './play.png';
        document.getElementById('playButton').onclick = startTutorial;
    }
}

async function startTutorial() {
    document.getElementById('playButton').hidden = true;
    const db = tableau.extensions.dashboardContent.dashboard;
    const extensionObject = db.objects.find(obj => obj.id == tableau.extensions.dashboardObjectId);
    initialPos = extensionObject.position;
    initialSize = extensionObject.size;
    await db.moveAndResizeDashboardObjectsAsync([{
        dashboardObjectID: tableau.extensions.dashboardObjectId,
        x: 0,
        y: 0,
        width: db.size.width,
        height: db.size.height
    }]);
    clippy.load('Clippy', (agent) => {
        clippyAgent = agent;
        agent.show();
        agent.play('Greeting');
        agent.play('GetAttention');
        agent.speak("Yes it's me! Clippy!");
        agent.speak("Who better to teach you how to use this dashboard?");
        agent.speak("Click me to start your custom tutorial.");
    });
    document.body.onclick = advanceClippy;
}

async function advanceClippy() {
    const db = tableau.extensions.dashboardContent.dashboard;
    if(currentClippyMove == tutorial.length) {
        await db.moveAndResizeDashboardObjectsAsync([{
            dashboardObjectID: tableau.extensions.dashboardObjectId,
            x: initialPos.x,
            y: initialPos.y,
            width: initialSize.width,
            height: initialSize.height
        }]);
        clippyAgent.play('SendMail');
        setTimeout(() => {
            clippyAgent.hide();
            document.getElementById('playButton').hidden = false;
        }, 4000)
        // clippyAgent.hide();
        currentClippyMove = 0;
    } else {
        const action = tutorial[currentClippyMove];
        switch(action.type) {
            case 'highlight' :
                currentClippyMove = currentClippyMove + 1;
                const object = db.objects.find(ws => ws.name == action.value);
                const x = object.position.x + object.size.width - 200;
                const y = object.position.y + object.size.height - 200;
                clippyAgent.moveTo(x,y);
                clippyAgent.play('GestureRight');
                advanceClippy();
                break;
            case 'message' :
                currentClippyMove = currentClippyMove + 1;
                clippyAgent.speak(action.value);
                break;
            case 'describe' :
                const worksheet = db.worksheets.find(ws => ws.name == action.value);
                const worksheetData = await worksheet.getSummaryDataAsync();
                const nsResponse = await fetch('https://prod-viz-saas-api.narrativescience.com/v2/stories/linechart?user_key=', {
                    method: "POST",
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify(craftNSData(worksheetData))
                });
                console.log(nsResponse);
                currentClippyMove = currentClippyMove + 1;
                clippyAgent.speak(action.value);
                break;
            case 'challenge' :
                await tableau.extensions.setClickThroughAsync(true);
                ws = db.worksheets.find(ws => ws.name == action.data.worksheet);
                let eventRemover = ws.addEventListener(tableau.TableauEventType.MarkSelectionChanged, checkSelectedMarks);
                clippyAgent.speak(`Try clicking on a mark where ${action.data.field} equals ${action.data.value}`);
                clippyAgent.play('Searching');

                async function checkSelectedMarks(marksEvent) {
                    clippyAgent.play('CheckingSomething');
                    const marksCollection = await marksEvent.getMarksAsync();
                    const marks = marksCollection.data[0];
                    const targetColIndex = marks.columns.find(c => c.fieldName == action.data.field).index;
                    if(marks.data.length > 1) {
                        clippyAgent.play('Wave');
                        clippyAgent.speak("You selected more than one mark. Try selecting only one mark");
                    } else if(marks.data.length === 1) {
                        if(marks.data[0][targetColIndex].value == action.data.value) {
                            clippyAgent.play('Congratulate');
                            clippyAgent.speak("Yep that's right!");
                            tableau.extensions.setClickThroughAsync(false);
                            currentClippyMove = currentClippyMove + 1;
                            eventRemover();
                        } else {
                            clippyAgent.play('Wave');
                            clippyAgent.speak(`You selected a mark where ${action.data.field} equals ${marks.data[0][targetColIndex].value}`);
                            clippyAgent.speak(`Try clicking on a mark where ${action.data.field} equals ${action.data.value}`);
                        }
                    }
                }
                break;
        }
    }
}

function craftNSData(tabData) {
    let data = {"data":
    {"dimensions":
        [
            {"dataType":"date-time","name":"Release Date","id":"col:1",
                "labels": [{"singular":"day","plural":"days","id":"lab:1"}]},
            {"dataType":"string","name":"Distributor","id":"col:0",
                "labels": [{"singular":"distributor","plural":"distributors","id":"lab:0"}]
            },
            {"dataType":"string","name":"Release","id":"col:2",
                "labels": [{"singular":"release","plural":"releases","id":"lab:2"}]
            }
        ],
    "measures":
        [{"name":"revenue","id":"col:3","format":"number","is_percentage":false,        
            "format_options":{"money_locale":"USD","label":"US Dollar ($1,234)"},"up_sentiment":"good","cumulative":"add_values"}],
    "rows":[
        [{"value":"Sony Pictures Releasing","id":0},{"value":"10/18/2019","id":1},{"value":"Zombieland: Double Tap","id":2},{"value":"73,100,000","id":3}],
        [{"value":"Universal Pictures","id":4},{"value":"6/28/2019","id":5},{"value":"Yesterday","id":6},{"value":"73,300,000","id":7}],
        [{"value":"Twentieth Century Fox","id":8},{"value":"6/7/2019","id":9},{"value":"X-Men: Dark Phoenix","id":10},{"value":"65,800,000","id":11}],
        [{"value":"Paramount Pictures","id":12},{"value":"3/15/2019","id":13},{"value":"Wonder Park","id":14},{"value":"45,200,000","id":15}],
        [{"value":"Paramount Pictures","id":16},{"value":"2/7/2019","id":17},{"value":"What Men Want","id":18},{"value":"54,600,000","id":19}],
        [{"value":"Sony Pictures Releasing","id":20},{"value":"10/18/2019","id":21},{"value":"aZombieland: Double Tap","id":22},{"value":"173,100,000","id":23}],
        [{"value":"Universal Pictures","id":24},{"value":"6/28/2019","id":25},{"value":"aYesterday","id":26},{"value":"173,300,000","id":27}],
        [{"value":"Twentieth Century Fox","id":28},{"value":"6/7/2019","id":29},{"value":"aX-Men: Dark Phoenix","id":30},{"value":"165,800,000","id":31}],
        [{"value":"Paramount Pictures","id":32},{"value":"3/15/2019","id":33},{"value":"aWonder Park","id":34},{"value":"145,200,000","id":35}],
        [{"value":"Paramount Pictures","id":36},{"value":"2/7/2019","id":37},{"value":"aWhat Men Want","id":38},{"value":"154,600,000","id":39}]
    ]
    },
    "api_version":2,
    "configuration":{"authoring":{"format":"paragraph","verbosity":"low","is_linked_to_chart":false,"run_support_story":false,"selection_made":false,"custom_content":{"header":{"content":[]},"footer":{"content":[]},"null-value-disclaimer":{"content":[]},"intro":{"content":[]},"drilldown0":{"content":[]},"drilldown1":{"content":[]}}}},
    "metadata":{"valueType":"continuous","platform":"tableau","apiKey":"","flags":{"useFunctions":true,"useConditionals":true}}};

    return data;

}

