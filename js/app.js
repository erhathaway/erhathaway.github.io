var app = angular.module('myApp', ['ngMaterial']);

app.controller('MyController', function($scope, $mdSidenav) {
  $scope.openLeftMenu = function() {
    $mdSidenav('left').toggle();
  };
});

app.controller('myName', function($scope) {
  $scope.firstName = "Ethan";
  $scope.lastName = "Hathaway";
});

app.controller('myLinks', function($scope) {
  var data = {
              "linkedin": {
                            "link": "https://www.linkedin.com/in/erhathaway",
                            "icon": "Linkedin-icon.png"
                           },
              "twitter": {
                            "link" : "https://twitter.com/erhathaway",
                            "icon" : null
                         },
              "github": {
                          "link": "https://github.com/erhathaway",
                          "icon" : null
                        }
            };
  $scope.linkNames = Object.keys(data);
});