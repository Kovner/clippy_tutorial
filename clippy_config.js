window.onload = function() {
    var app = new Vue({
        el: '#configApp',
        data: {
            state: "home",
            worksheetNames: [],
            fieldNames: [],
            selectedHighlightWorksheet: '',
            selectedMessage: '',
            challengeData: {
                worksheet: '',
                field: '',
                value: ''
            },
            selectedNarrativeWorksheet: '',
            actions: []
        },
        methods: {
            setState: function(newState) {this.state = newState;},

            handleChallengeWsSelected: async function() {
                const dashboard = tableau.extensions.dashboardContent.dashboard;
                const worksheets = dashboard.worksheets;
                const ws = worksheets.find(ws => ws.name === this.challengeData.worksheet);
                const cols = await ws.getSummaryColumnsInfoAsync();
                this.fieldNames = cols.map(col => col.fieldName);
            },

            submitHighlight: function() {
                this.actions.push({type: 'highlight', value: this.selectedHighlightWorksheet});
                this.selectedHighlightWorksheet = "";
                this.state = "home";
            },
            submitMessage: function() {
                this.actions.push({type: 'message', value: this.selectedMessage});
                this.selectedMessage = "";
                this.state = "home";
            },
            submitChallenge: function() {
                this.actions.push({type: 'challenge', data: this.challengeData});
                this.challengeData = {worksheet: '', field: '', value: ''};
                this.fieldNames = [];
                this.state = "home";
            },
            submitNarrative: function() {
                this.actions.push({type: 'describe', value: this.selectedNarrativeWorksheet});
                this.selectedNarrativeWorksheet = "";
                this.state = "home";
            },
            cancel: function() {
                this.fieldNames= [];
                this.selectedHighlightWorksheet= '';
                this.selectedMessage= '';
                this.challengeData= {
                    worksheet: '',
                    field: '',
                    value: ''
                };
                this.selectedNarrativeWorksheet= '';
                this.state= "home";
            },
            submitTutorial: async function() {
                tableau.extensions.settings.set('actions', JSON.stringify(this.actions));
                await tableau.extensions.settings.saveAsync();
                tableau.extensions.ui.closeDialog('Dialog Closed');
            }
        }
    }) ;

    tableau.extensions.initializeDialogAsync().then(function(openPaylod) {
        
        const dashboard = tableau.extensions.dashboardContent.dashboard;
        const worksheets = dashboard.worksheets;
        const worksheetNames = worksheets.map(ws => ws.name);
        app.worksheetNames = worksheetNames;
    });
};