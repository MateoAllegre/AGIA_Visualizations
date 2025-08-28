/***********************************************************
 * Annotation Tool                                         *
 * Can be used to add information to some parts of a mesh  *
 * The information is added to a certain point of the mesh *
 ***********************************************************/

// NOT FINISHED, MOSTLY JUST CODE TAKEN FROM THE MEASUREMENT TOOL AND MODIFIED FOR
// AN EVENTUAL MEASUREMENT TOOL

const AnnotationTool = (function () {
    var scene; // BabylonJS scene, required to process mouse inputs, for example
    var atObserver; // Pointer observer for the annotation tool
    var atButton; // Button to activate annotation tool

    // Enables the annotation tool on the current mesh
    function enable() {
        // Hide the button
        hideButton();

        // Tracks when and where the currently held click on the mesh has started
        var startingPoint = null;
        var startingTime = null;

        // If tool is already enabled, do nothing
        if(atObserver) return;

        // Pointer events to xxx
        atObserver = scene.onPointerObservable.add((pointerInfo) => {
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

    // Disables the annotation tool for the current mesh, if any
    function disable() {
        // If an observer has been defined, remove it
        if(atObserver) {
            scene.onPointerObservable.remove(atObserver);
            atObserver = null;
        }
    }

    // Initializes all the necessary components for the annotation tool, in the given scene, attaching the UI to the given AdvancedTexture
    async function init(babylonScene, advancedTexture) {
        scene = babylonScene;

        // Non-UI objects and materials

        

        // UI Elements

        

        // Button with an icon, to activate the annotation tool
        atButton = new BABYLON.GUI.Button("atButton");
        const atButtonImage = new BABYLON.GUI.Image("atButtonImage", "./gui/annotation.png");
        atButton.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_BOTTOM;
        atButton.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
        atButton.left = "10px";
        atButton.top = "-10px";
        atButton.width = "90px";
        atButton.height = "90px";
        atButton.cornerRadius = 10;
        atButton.background = "#222222aa";
        atButton.thickness = 2;
        atButton.isVisible = false; // only visible when a mesh is loaded, not by default
        atButton.addControl(atButtonImage);
        advancedTexture.addControl(atButton);

        // On click, activate tool
        atButton.onPointerClickObservable.add(() => {
            enable();
        });

        // Tool is disabled by default since there's no mesh
        disable();
    }

    const showButton = () => {atButton.isVisible = true};
    const hideButton = () => {atButton.isVisible = false};

    return {
        showButton,
        hideButton,
        enable,
        disable,
        init
    };
})();

export default AnnotationTool;