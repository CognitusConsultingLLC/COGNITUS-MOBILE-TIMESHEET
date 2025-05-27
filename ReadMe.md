PART 1: Deploy Fiori App to SAP BTP (HTML5 Application)
1. Prerequisites
Make sure you have:
•	Fiori app (GIT URL : https://github.com/CognitusConsultingLLC/AMAZON-MOBILE-TIMESHEET.git)
•	SAP BTP Subaccount with following service enabled:
o	Cloud Foundry enabled
o	HTML5 Application Repository
o	BAS Service subscription
o	SAP Launchpad Service or SAP Build Work Zone, Standard Edition
3. Login to SAP BTP and Select the Sub Account. Goto ‘Instances and Subscriptions’ option in left pane and select ‘SAP Business Application Studio’ in subscriptions. 
4. Create a Dev Space if required and run it. You will be redirected to BAS. BAS is loaded with Get Started screen in that select ‘Clone from Git’ option to clone the repo from the provided git URL
5. Create a destination named 'SAP-S4-PP' using principle propagation.
6. Post cloning from the git, add appropriate destination details in 'XS-App.json'. Right click on ‘mta.yaml’ file and select ‘Build MTA Project’.
7. Once build is completed mtar file get updated in ‘mta_archives’ folder. Right click on updated mtar file and select ‘Deploy MTA Archive’ file.
8. You will be requested for ‘Cloud Foundry’ sign in screen, provide valid credentials, select valid organization and space and click on ‘Apply’.
9. Post performing the above steps app is deployed as ‘HTML5Applications’ in SAP BTP with provided app id.
