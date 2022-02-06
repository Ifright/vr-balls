import {Controller} from "./Controller";
import * as THREE from "three";
import {GLTFLoader} from "three/examples/jsm/loaders/GLTFLoader";
import {XRControllerModelFactory} from "three/examples/jsm/webxr/XRControllerModelFactory";

export class DragController extends Controller {
    raycaster = new THREE.Raycaster()
    spotlights = {}

    constructor(renderer, index, scene, movableObjects, highlight) {
        super(renderer, index)
        this.scene = scene
        this.movableObjects = movableObjects
        this.highlight = highlight
        this.build(index)
    }

    handle() {
        super.handle()
        if (this.controller.userData.selectPressed) {
            this.controller.children[0].scale.z = 10
            this.workingMatrix.identity().extractRotation(this.controller.matrixWorld)

            this.raycaster.ray.origin.setFromMatrixPosition(this.controller.matrixWorld)

            this.raycaster.ray.direction.set(0, 0, -1).applyMatrix4(this.workingMatrix)

            const intersects = this.raycaster.intersectObjects(this.room.children)

            if (intersects.length > 0) {
                if (intersects[0].object.uuid !== this.highlight.uuid) {
                    intersects[0].object.add(this.highlight)
                }
                this.highlight.visible = true
                this.controller.children[0].scale.z = intersects[0].distance
            } else {
                this.highlight.visible = false
            }
        }
    }

    build(index) {
        const controllerModelFactory = new XRControllerModelFactory()
        const geometry = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(0, 0, -1)
        ])
        const line = new THREE.Line(geometry)
        line.name = 'line'
        line.scale.z = 10

        const controller = this.renderer.xr.getController(index)

        this.controller.add(line)
        this.controller.userData.selectPressed = false

        const grip = this.renderer.xr.getControllerGrip(index)
        grip.add(controllerModelFactory.createControllerModel(grip))
        this.scene.add(grip)

        const self = this

        function onSelectStart(event) {
            const controller = event.target;
            const intersections = getIntersections(controller);

            if (intersections.length > 0) {
                const intersection = intersections[0];
                const object = intersection.object;
                object.material.emissive.b = 1;
                controller.attach(object);
                controller.userData.selected = object;
            }
        }

        function onSelectEnd(event) {
            const controller = event.target;

            if (controller.userData.selected !== undefined) {
                const object = controller.userData.selected;
                object.material.emissive.b = 0;
                self.movableObjects.attach(object);
                controller.userData.selected = undefined;
            }
        }

        this.controller.addEventListener('selectstart', onSelectStart);
        this.controller.addEventListener('selectend', onSelectEnd);

        const tempMatrix = new THREE.Matrix4();
        const rayCaster = new THREE.Raycaster();
        const intersected = [];

        this.controller.handle = () => {
            cleanIntersected();
            intersectObjects(this.controller)
        }

        this.scene.add(this.controller)

        function getIntersections(controller) {

            tempMatrix.identity().extractRotation(controller.matrixWorld);

            rayCaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
            rayCaster.ray.direction.set(0, 0, -1).applyMatrix4(tempMatrix)

            return rayCaster.intersectObjects(self.movableObjects.children);
        }

        function intersectObjects(controller) {
            if (controller.userData.selected !== undefined) return;

            const line = controller.getObjectByName('line');
            const intersections = getIntersections(controller);

            if (intersections.length > 0) {
                const intersection = intersections[0];

                const object = intersection.object;
                object.material.emissive.r = 1;
                intersected.push(object);
                line.scale.z = intersection.distance;
            } else {
                line.scale.z = 5;
            }
        }

        function cleanIntersected() {
            while (intersected.length) {
                const object = intersected.pop();
                object.material.emissive.r = 0;
            }
        }
    }
}