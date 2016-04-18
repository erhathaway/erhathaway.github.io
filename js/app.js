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

app.controller('myCategories', function($scope) {
  var data = {
    "Projects": {
      "categories": [
        {
          "name": "Woodworking",
          "projects": ["Bed", "Shelf"]
        },
        {
          "name": "Software",
          "projects": ["abBlast", "Ryzome", "portfolio single page app"]
        },
        {
          "name": "Hardware",
          "projects": ["Homethermic Heater", "Supersoaker"]
        },
        {
          "name": "Gardening",
          "projects": ["Hydroponics", "Parents Garden"]
        },
      ]
    },
    "Resumes" : {
      "categories": [
        {
          "name": "Biological Science"
        },
        {
          "name": "Software Engineering"
        }
      ],
    }
  }

  $scope.getCategoryTypes = function() {
    return Object.keys(data);
  }

  $scope.getCategories = function(category_type) {
    return data[category_type]["categories"];
  }
});

app.controller('myProjects', function($scope) {
  var projects = {
    "Bed":
      {
        "folder": "Bed",
        "main_image":"20150927_185810.jpg",
        "long_name": "Arts and Crafts (Mission) Style Bed",
        "summary": "oh my blahh",
        "year": 2015,
        "pieces": [
          {
            "image_name": "lalah.png",
            "description": "ohlahlah"
          },
          {
            "image_name": "lalah.png",
            "description": "ohlahlah"
          }
        ]
      },
    "Shelf":
      {
        "folder":"Shelf",
        "main_image":"20160408_214248.jpg",
        "long_name": "Scandinavian Inspired Shelf",
        "summary": "oh my shelf!",
        "year": 2016,
        "pieces": [
          {
            "image_name": "lalah.png",
            "description": "ohlahlah"
          },
          {
            "image_name": "lalah.png",
            "description": "ohlahlah"
          }
        ]
      }
    }

  $scope.getProjects = function() {
    return projects;
  }

  $scope.getMainImages = function() {
    var main_images = []
    for (var project in projects) {
      if (!data.hasOwnProperty(project)) {
        continue;
      }
      var image_path = "images/projects/".concat(project).concat("/").concat(projects[project]["main_image"])
      main_images.push(image_path)
    }
    return main_images;
  }
});
