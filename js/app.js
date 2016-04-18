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
  var categories = {
    "Projects": {
      "order": 1,
      "items": [
        {
          "name": "Woodworking",
          // "pieces": [
          //   {
          //     "image": "blahhh",
          //     "description": "ohmyblahh",
          //     "position": 1,
          //     "default": true,
          //   }],
        },
        {
          "name": "Software",

        },
        {
          "name": "Hardware",

        },
        {
          "name": "Gardening",
        },
      ]
    },
    "Resumes" : {
      "items": [
        {
          "name": "Biological Science"
        },
        {
          "name": "Software Engineering"
        }
      ],
    }
  }

  $scope.getCategoryNames = function() {
    return Object.keys(categories);
  }

  $scope.getCategoryItems = function(category_name) {
    return categories[category_name]["items"];
  }

  // $scope.getCategoryItemNames = function(category_name) {
  //   var items = getCategoryItems(category_name);
  //   return Object.keys(items);
  // }

  // $scope.categoryItemNames = getCategoryItemNames(category_name);
  // $scope.categoryNames = getCategoryNames();
});