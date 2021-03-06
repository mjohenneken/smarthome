angular.module('PaperUI.controllers.control', []).controller('ControlPageController', function($scope, $routeParams, $location, $timeout, itemRepository, thingTypeRepository, thingService, thingTypeService, channelTypeService, thingConfigService, imageService, util) {
    $scope.items = [];
    $scope.selectedIndex = 0;
    $scope.tabs = [];
    $scope.things = [];
    var thingTypes = [];

    $scope.navigateTo = function(path) {
        $location.path(path);
    }
    $scope.next = function() {
        var newIndex = $scope.selectedIndex + 1;
        if (newIndex > ($scope.tabs.length - 1)) {
            newIndex = 0;
        }
        $scope.selectedIndex = newIndex;
    }
    $scope.prev = function() {
        var newIndex = $scope.selectedIndex - 1;
        if (newIndex < 0) {
            newIndex = $scope.tabs.length - 1;
        }
        $scope.selectedIndex = newIndex;
    }

    $scope.refresh = function() {
        itemRepository.getAll(function(items) {
            $scope.items = items;
        }, true);
        getThings();
    }
    $scope.channelTypes = [];
    $scope.thingTypes = [];
    $scope.thingChannels = [];
    $scope.isLoadComplete = false;
    var thingList;
    function getThings() {
        $scope.things = [];
        thingService.getAll().$promise.then(function(things) {
            thingList = things;
            $scope.isLoadComplete = false;
            thingTypeService.getAll().$promise.then(function(thingTypes) {
                $scope.thingTypes = thingTypes;
                channelTypeService.getAll().$promise.then(function(channels) {
                    $scope.channelTypes = channels;
                    var thingTypesUsed = getUsedThingTypesUIDs(thingList);
                    for (var i = 0; i < thingTypesUsed.length; i++) {
                        thingTypeService.getByUid({
                            thingTypeUID : thingTypesUsed[i]
                        }, function(thingType) {
                            thingTypes.push(thingType);
                            for (var t_i = 0; t_i < thingList.length; t_i++) {
                                if (thingList[t_i].thingTypeUID === thingType.UID) {
                                    renderThing(thingList[t_i], thingType, $scope.channelTypes);
                                }
                                if (i == thingTypesUsed.length && t_i == thingList.length - 1) {
                                    getTabs();
                                }
                            }
                        });
                    }
                });
            });

        });
    }
    function renderThing(thing, thingType, channelTypes) {
        thing.thingChannels = thingConfigService.getThingChannels(thing, thingType, channelTypes, true);
        angular.forEach(thing.thingChannels, function(value, key) {
            thing.thingChannels[key].channels = $.grep(thing.thingChannels[key].channels, function(channel, i) {
                return channel.linkedItems.length > 0;
            });
        });
        if (thingHasChannels(thing) && $scope.things.indexOf(thing) == -1) {
            $scope.things.push(thing);
        }
    }
    function thingHasChannels(thing) {
        for (var i = 0; i < thing.thingChannels.length; i++) {
            if (thing.thingChannels[i].channels && thing.thingChannels[i].channels.length > 0) {
                return true;
            }
        }
        return false;
    }

    function getTabs() {
        if (!$scope.things) {
            return;
        }
        var arr = [], otherTab = false;
        for (var i = 0; i < $scope.things.length; i++) {
            if ($scope.things[i].location && $scope.things[i].location.toUpperCase() != "OTHER") {
                $scope.things[i].location = $scope.things[i].location.toUpperCase();
                arr[$scope.things[i].location] = $scope.things[i].location;
            } else {
                $scope.things[i].location = "OTHER";
                otherTab = true;
            }
        }
        for ( var value in arr) {
            if (!hasTab(value)) {
                $scope.tabs.push({
                    name : value
                });
            }
        }
        if (otherTab && !hasTab("OTHER")) {
            $scope.tabs.push({
                name : "OTHER"
            });
        }
        $scope.isLoadComplete = true;
    }

    function hasTab(name) {
        return $.grep($scope.tabs, function(tab) {
            return tab.name == name;
        }).length > 0;
    }

    function getThingTypeLocal(thingTypeUID) {
        var thingTypeComplete = $.grep(thingTypes, function(thingType) {
            return thingType.UID == thingTypeUID;
        });
        return thingTypeComplete.length > 0 ? thingTypeComplete : null;
    }

    function getUsedThingTypesUIDs(things) {
        var thingTypeUIDs = [];
        if (things) {
            for (var i = 0; i < things.length; i++) {
                if (thingTypeUIDs.indexOf(things[i].thingTypeUID) == -1) {
                    thingTypeUIDs.push(things[i].thingTypeUID);
                }
            }
        }
        return thingTypeUIDs;
    }

    $scope.tabComparator = function(actual, expected) {
        return actual == expected;
    }

    $scope.getItem = function(itemName) {
        for (var i = 0; i < $scope.data.items.length; i++) {
            var item = $scope.data.items[i];
            if (item.name === itemName) {
                if (item.type && (item.type == "Number" || item.groupType == "Number" || item.type == "Rollershutter")) {
                    var parsedValue = Number(item.state);
                    if (isNaN(parsedValue)) {
                        item.state = null;
                    } else {
                        item.state = parsedValue;
                    }
                }
                if (item.type && item.type == "Image") {
                    imageService.getItemState(item.name).then(function(state) {
                        item.state = state;
                        item.imageLoaded = true;
                    });
                    item.imageLoaded = false;
                }
                item.stateText = util.getItemStateText(item);
                return item;
            }
        }
        return null;
    }

    $scope.masonry = function() {
        if ($scope.data.items) {
            $timeout(function() {
                var itemContainer = '#items-' + $scope.selectedIndex;
                new Masonry(itemContainer, {});
            }, 100, true);
        }
    }
    $scope.$on('ngRepeatFinished', function(ngRepeatFinishedEvent) {
        $scope.masonry();
    });
    $scope.refresh();

}).controller('ControlController', function($scope, $timeout, $filter, itemService, util) {

    $scope.getItemName = function(itemName) {
        return itemName.replace(/_/g, ' ');
    }

    $scope.getMinText = function(item) {
        if (!item.stateDescription || isNaN(item.stateDescription.minimum)) {
            return '';
        } else if (!item.stateDescription.pattern) {
            return '' + item.stateDescription.minimum;
        } else {
            return sprintf(item.stateDescription.pattern, item.stateDescription.minimum);
        }
    }

    $scope.getMaxText = function(item) {
        if (!item.stateDescription || isNaN(item.stateDescription.maximum)) {
            return '';
        } else if (!item.stateDescription.pattern) {
            return '' + item.stateDescription.maximum;
        } else {
            return sprintf(item.stateDescription.pattern, item.stateDescription.maximum);
        }
    }

    var categories = {
        'Alarm' : {},
        'Battery' : {},
        'Blinds' : {},
        'ColorLight' : {
            label : 'Color',
            icon : 'wb_incandescent'
        },
        'Contact' : {},
        'DimmableLight' : {
            label : 'Brightness',
            icon : 'wb_incandescent',
            showSwitch : true
        },
        'CarbonDioxide' : {
            label : 'CO2'
        },
        'Door' : {},
        'Energy' : {},
        'Fan' : {},
        'Fire' : {},
        'Flow' : {},
        'GarageDoor' : {},
        'Gas' : {},
        'Humidity' : {},
        'Light' : {},
        'Motion' : {},
        'MoveControl' : {},
        'Player' : {},
        'PowerOutlet' : {},
        'Pressure' : {
        // icon: 'home-icon-measure_pressure_bar'
        },
        'Rain' : {},
        'Recorder' : {},
        'Smoke' : {},
        'SoundVolume' : {
            label : 'Volume',
            icon : 'volume_up'
        },
        'Switch' : {},
        'Temperature' : {
            label : 'Temperature'
        },
        'Water' : {},
        'Wind' : {},
        'Window' : {},
        'Zoom' : {},
    }

    $scope.getLabel = function(itemCategory, name, defaultLabel) {
        if (name) {
            var item = $.grep($scope.items, function(item) {
                return item.name == name;
            });
            if (item.length > 0) {
                return item[0].label;
            }
        }

        if (itemCategory) {
            var category = categories[itemCategory];
            if (category) {
                return category.label ? category.label : itemCategory;
            } else {
                return defaultLabel;
            }
        } else {
            return defaultLabel;
        }
    }
    $scope.getIcon = function(itemCategory, fallbackIcon) {
        var defaultIcon = fallbackIcon ? fallbackIcon : 'radio_button_unchecked';
        if (itemCategory) {
            var category = categories[itemCategory];
            if (category) {
                return category.icon ? category.icon : defaultIcon;
            } else {
                return defaultIcon;
            }
        } else {
            return defaultIcon;
        }
    }
    $scope.showSwitch = function(itemCategory) {
        if (itemCategory) {
            var category = categories[itemCategory];
            if (category) {
                return category.showSwitch;
            }
        }
        return false;
    }
    $scope.isReadOnly = function(item) {
        return item.stateDescription ? item.stateDescription.readOnly : false;
    }

    /**
     * Check if the item has a configured option list. Returns true if there are options, otherwise false.
     * 
     * @param item
     *            the current item
     */
    $scope.isOptionList = function(item) {
        return (item.stateDescription != null && item.stateDescription.options.length > 0)
    }
}).controller('ItemController', function($rootScope, $scope, itemService, util) {
    $scope.editMode = false;
    $scope.sendCommand = function(command, updateState) {
        $rootScope.itemUpdates[$scope.item.name] = new Date().getTime();
        itemService.sendCommand({
            itemName : $scope.item.name
        }, command);
        if (updateState) {
            $scope.item.state = command;
        }
        $scope.item.stateText = util.getItemStateText($scope.item);
    };
    $scope.editState = function() {
        $scope.editMode = true;
    };
    $scope.updateState = function() {
        $scope.sendCommand($scope.item.state, false);
        $scope.editMode = false;
    };
}).controller('DefaultItemController', function($scope, itemService) {
    $scope.longEditMode = $scope.shortEditMode = false;
    $scope.optionListChanged = function() {
        $scope.sendCommand($scope.item.state, false);
    };
    $scope.editState = function(shortField) {
        if (shortField) {
            $scope.shortEditMode = true;
        } else {
            $scope.longEditMode = true;
        }
    };
    $scope.updateState = function(shortField) {
        $scope.sendCommand($scope.item.state, false);
        if (shortField) {
            $scope.shortEditMode = false;
        } else {
            $scope.longEditMode = false;
        }
    };

}).controller('ImageItemController', function($scope, itemService) {

    $scope.refreshCameraImage = function() {
        itemService.sendCommand({
            itemName : $scope.item.name
        }, "REFRESH");
    };

}).controller('SwitchItemController', function($scope, $timeout, itemService) {
    if ($scope.item.state === 'UNDEF' || $scope.item.state === 'NULL') {
        $scope.item.state = '-';
    }
    $scope.setOn = function(state) {
        $scope.sendCommand(state);
    }
}).controller('DimmerItemController', function($scope, $timeout, itemService) {
    if ($scope.item.state === 'UNDEF' || $scope.item.state === 'NULL') {
        $scope.item.state = '-';
    }
    $scope.on = parseInt($scope.item.state) > 0 ? 'ON' : 'OFF';

    $scope.setOn = function(on) {
        $scope.on = on === 'ON' ? 'ON' : 'OFF';

        $scope.sendCommand(on);

        var brightness = parseInt($scope.item.state);
        if (on === 'ON' && brightness === 0) {
            $scope.item.state = 100;
        }
        if (on === 'OFF' && brightness > 0) {
            $scope.item.state = 0;
        }
    }
    $scope.pending = false;
    $scope.setBrightness = function(brightness) {
        // send updates every 300 ms only
        if (!$scope.pending) {
            $timeout(function() {
                var command = $scope.item.state === 0 ? '0' : $scope.item.state;
                $scope.sendCommand(command);
                $scope.pending = false;
            }, 300);
            $scope.pending = true;
        }
    }
    $scope.$watch('item.state', function() {
        var brightness = parseInt($scope.item.state);
        if (brightness > 0 && $scope.on === 'OFF') {
            $scope.on = 'ON';
        }
        if (brightness === 0 && $scope.on === 'ON') {
            $scope.on = 'OFF';
        }
    });
}).controller('ColorItemController', function($scope, $timeout, $element, itemService) {

    if ($scope.item.state === 'UNDEF' || $scope.item.state === 'NULL') {
        $scope.item.state = '-';
    }
    function getStateAsObject(state) {
        var stateParts = state.split(",");
        if (stateParts.length == 3) {
            return {
                h : parseInt(stateParts[0]),
                s : parseInt(stateParts[1]),
                b : parseInt(stateParts[2])
            }
        } else {
            return {
                h : 0,
                s : 0,
                b : 0
            }
        }
    }

    function toState(stateObject) {
        return Math.ceil(stateObject.h) + ',' + Math.ceil(stateObject.s) + ',' + Math.ceil(stateObject.b);
    }

    $scope.pending = false;

    $scope.setBrightness = function(brightness) {
        $scope.brightness = brightness;
        if (!$scope.pending) {
            $timeout(function() {
                var command = isNaN($scope.brightness) ? '0' : $scope.brightness;
                $scope.sendCommand(command);
                $scope.pending = false;
            }, 300);
            $scope.pending = true;
        }
    }

    $scope.setHue = function(hue) {
        $scope.hue = hue;
        setColor();
    }

    $scope.setSaturation = function(saturation) {
        $scope.saturation = saturation;
        setColor();
    }

    function setColor() {
        // send updates every 300 ms only
        if (!$scope.pending) {
            $timeout(function() {
                var stateObject = getStateAsObject($scope.item.state);
                stateObject.b = isNaN($scope.brightness) ? '0' : $scope.brightness;
                stateObject.s = isNaN($scope.saturation) ? '0' : $scope.saturation;
                stateObject.h = isNaN($scope.hue) ? '0' : $scope.hue;
                if ($scope.item.state == "UNDEF" || $scope.item.state === 'NULL' || $scope.item.state === '-') {
                    stateObject.b = 100;
                    stateObject.s = 100;
                    $scope.brightness = stateObject.b;
                    $scope.saturation = stateObject.s;
                }
                $scope.item.state = toState(stateObject);
                $scope.sendCommand($scope.item.state);
                $scope.pending = false;
            }, 300);
            $scope.pending = true;
        }
    }

    $scope.getHexColor = function(hue) {
        var hsv = tinycolor({
            h : hue,
            s : 1,
            v : 1
        }).toHsv();
        return tinycolor(hsv).toHexString();
    }

    var setStates = function() {
        var stateObject = getStateAsObject($scope.item.state);
        var hue = stateObject.h;
        var brightness = stateObject.b;
        var saturation = stateObject.s;

        $scope.hue = hue ? hue : 0;
        $scope.brightness = brightness ? brightness : 0;
        $scope.saturation = saturation ? saturation : 0;
    }

    setStates();

    $scope.$watch('item.state', function() {
        setStates();
    });

    $scope.$watch('hue', function() {
        var hexColor = $scope.getHexColor($scope.hue);
        $($element).find('.hue .md-thumb').css('background-color', hexColor);
    });

    var hexColor = $scope.getHexColor();
    $($element).find('.hue .md-thumb').css('background-color', hexColor);
}).controller('RollershutterItemController', function($scope) {
    if ($scope.item.state === 'UNDEF' || $scope.item.state === 'NULL') {
        $scope.item.state = '-';
    }
}).controller('PlayerItemController', function($scope, $timeout) {

    var isInterrupted, time;
    $scope.onPrevDown = function() {
        isInterrupted = false;
        time = new Date().getTime();
        $timeout(function() {
            if (!isInterrupted) {
                $scope.sendCommand('REWIND');
            }
        }, 300);
    }

    $scope.onPrevUp = function() {
        var newTime = new Date().getTime();
        if (time + 300 > newTime) {
            isInterrupted = true;
            $scope.sendCommand('PREVIOUS');
        } else {
            $timeout(function() {
                $scope.sendCommand('PLAY');
            });
        }
    }

    $scope.onNextDown = function() {
        isInterrupted = false;
        time = new Date().getTime();
        $timeout(function() {
            if (!isInterrupted) {
                $scope.sendCommand('FASTFORWARD');
            }
        }, 300);
    }

    $scope.onNextUp = function() {
        var newTime = new Date().getTime();
        if (time + 300 > newTime) {
            isInterrupted = true;
            $scope.sendCommand('NEXT');
        } else {
            $timeout(function() {
                $scope.sendCommand('PLAY');
            });
        }
    }

}).controller('LocationItemController', function($scope, $sce) {
    $scope.init = function() {
        if ($scope.item.state !== 'UNDEF' && $scope.item.state !== 'NULL') {
            var latitude = parseFloat($scope.item.state.split(',')[0]);
            var longitude = parseFloat($scope.item.state.split(',')[1]);
            var bbox = (longitude - 0.01) + ',' + (latitude - 0.01) + ',' + (longitude + 0.01) + ',' + (latitude + 0.01);
            var marker = latitude + ',' + longitude;
            $scope.formattedState = latitude + '°N ' + longitude + '°E';
            $scope.url = $sce.trustAsResourceUrl('https://www.openstreetmap.org/export/embed.html?bbox=' + bbox + '&marker=' + marker);
        } else {
            $scope.formattedState = '- °N - °E';
        }
    };
    $scope.$watch('item.state', function() {
        $scope.init();
    });
    $scope.init();
}).directive('itemStateDropdown', function() {
    return {
        restrict : 'A',
        templateUrl : "partials/item.state.dropdown.html"
    };
})
