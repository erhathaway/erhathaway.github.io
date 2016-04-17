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

app.controller('myData', function($scope) {
  var data = {
    "categories": [
      {
        "name": "Projects",
        "pieces": [
          {
            "name": "Woodworking",
            "items": [
              {
                "image": "blahhh",
                "description": "ohmyblahh",
                "position": 1,
                "default": true,
              }],
          },
          {
            "name": "Software"
          }]
      },
      {
        "name": "Resumes",
        "pieces": [],
      }]
  }

  // $scope.categoryNames = function () {
  //   var names = [];
  //   for (var category in data["categories"]) {
  //     names.push(category["name"]);
  //   };
  //   return names
  // };
  $scope.categoryNames = ["PROJECTS", "RESUME"]

//   // $scope.categoryNames = Objects.keys(data.categories)
});