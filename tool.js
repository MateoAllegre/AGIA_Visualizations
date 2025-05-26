/********************
 * x Tool           *
 * Can be used to x *
 * x                *
 ********************/

const xTool = (function () {
    var scene; // BabylonJS scene, required to process mouse inputs, for example
    var xtObserver; // Pointer observer for the x tool
    var xtButton; // Button to activate x tool

    // Enables the x tool on the current mesh
    function enable() {
        // Hide the button
        hideButton();

        // Tracks when and where the currently held click on the mesh has started
        var startingPoint = null;
        var startingTime = null;

        // If tool is already enabled, do nothing
        if(xtObserver) return;

        // Pointer events to xxx
        xtObserver = scene.onPointerObservable.add((pointerInfo) => {
            switch(pointerInfo.type) {
                // When click starts, record the time and position of the click
                case BABYLON.PointerEventTypes.POINTERDOWN:
                    startingPoint = {x: pointerInfo.event.x, y: pointerInfo.event.y};
                    startingTime = Date.now();
                    break;
                // When click stops, test if it's valid (short stationary click on a mesh), if so, move the relevant point to the clicked point on the mesh
                case BABYLON.PointerEventTypes.POINTERUP:
                    // Click is ignored if held for over 150ms
                    if(Date.now() - startingTime > 150) return;

                    // Click is ignored if the mouse moved during the hold
                    if(pointerInfo.event.x != startingPoint.x || pointerInfo.event.y != startingPoint.y) return;

                    // Click is ignored if not on a mesh
                    if(!pointerInfo.pickInfo.hit || !pointerInfo.pickInfo.pickedPoint) return;

                    // Point on the mesh that was clicked, i.e. first intersection between the raycast and the mesh
                    var pickedPoint = pointerInfo.pickInfo.pickedPoint;

                    switch(pointerInfo.event.button) {
                        case 0: // LEFT CLICK
                            
                            break;
                        case 2: // RIGHT CLICK

                            break;
                    }
                    break;
            }
        });
    }

    // Disables the x tool for the current mesh, if any
    function disable() {
        // If an observer has been defined, remove it
        if(xtObserver) {
            scene.onPointerObservable.remove(xtObserver);
            xtObserver = null;
        }
    }

    // Initializes all the necessary components for the x tool, in the given scene, attaching the UI to the given AdvancedTexture
    async function init(babylonScene, advancedTexture) {
        scene = babylonScene;

        // Non-UI objects and materials

        

        // UI Elements

        

        // Button with an icon, to activate the x tool
        xtButton = new BABYLON.GUI.Button("xtButton");
        const xtButtonImage = new BABYLON.GUI.Image("xtButtonImage", "./gui/x.png");
        xtButton.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_BOTTOM;
        xtButton.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
        xtButton.left = "10px";
        xtButton.top = "-10px";
        xtButton.width = "90px";
        xtButton.height = "90px";
        xtButton.cornerRadius = 10;
        xtButton.background = "#222222aa";
        xtButton.thickness = 2;
        xtButton.isVisible = false; // only visible when a mesh is loaded, not by default
        xtButton.addControl(xtButtonImage);
        advancedTexture.addControl(xtButton);

        // On click, activate tool
        xtButton.onPointerClickObservable.add(() => {
            enable();
        });

        // Tool is disabled by default since there's no mesh
        disable();
    }

    const showButton = () => {xtButton.isVisible = true};
    const hideButton = () => {xtButton.isVisible = false};

    return {
        showButton,
        hideButton,
        enable,
        disable,
        init
    };
})();

export default xTool;