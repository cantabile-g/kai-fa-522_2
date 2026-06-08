/**
 * scene.js — Snake3D Three.js 场景渲染
 *
 * [成员B — 3D 场景渲染]
 * 职责：Three.js 场景搭建、蛇身渲染、食物渲染、
 *       网格地板、相机控制、粒子特效
 *
 * 依赖：Three.js (CDN 全局), GameEngine
 */

var Scene3D = (function () {
    'use strict';

    var scene, camera, renderer;
    var snakeMeshes = [];
    var foodMesh = null;
    var gridGroup = null;
    var floorPlane = null;
    var particles = [];
    var animationId = null;

    var GRID_SIZE = 18;
    var CENTER_OFFSET = (GRID_SIZE - 1) / 2;
    var SNAKE_Y = 0.25;
    var FOOD_Y = 0.4;
    var HEAD_COLOR = 0xffd700;
    var BODY_COLOR = 0x4caf50;
    var FOOD_COLOR = 0xff4444;

    function init(container) {
        scene = new THREE.Scene();
        scene.background = new THREE.Color(0x0a0a1a);
        scene.fog = new THREE.Fog(0x0a0a1a, 20, 50);

        var aspect = container.clientWidth / container.clientHeight;
        camera = new THREE.PerspectiveCamera(50, aspect, 0.5, 100);
        camera.position.set(14, 18, 14);
        camera.lookAt(0, 0, 0);

        renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(container.clientWidth, container.clientHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.shadowMap.enabled = true;
        container.appendChild(renderer.domElement);

        var ambientLight = new THREE.AmbientLight(0x404060, 0.8);
        scene.add(ambientLight);

        var dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
        dirLight.position.set(10, 20, 5);
        dirLight.castShadow = true;
        dirLight.shadow.mapSize.width = 1024;
        dirLight.shadow.mapSize.height = 1024;
        dirLight.shadow.camera.near = 0.5;
        dirLight.shadow.camera.far = 60;
        dirLight.shadow.camera.left = -15;
        dirLight.shadow.camera.right = 15;
        dirLight.shadow.camera.top = 15;
        dirLight.shadow.camera.bottom = -15;
        scene.add(dirLight);

        createFloor();
        createGrid();
        window.addEventListener('resize', onResize);
    }

    function createFloor() {
        var geometry = new THREE.PlaneGeometry(GRID_SIZE + 2, GRID_SIZE + 2);
        var material = new THREE.MeshStandardMaterial({
            color: 0x1a1a2e,
            roughness: 0.9,
            metalness: 0.1
        });
        floorPlane = new THREE.Mesh(geometry, material);
        floorPlane.rotation.x = -Math.PI / 2;
        floorPlane.position.y = -0.1;
        floorPlane.receiveShadow = true;
        scene.add(floorPlane);
    }

    function createGrid() {
        gridGroup = new THREE.Group();
        var lineMaterial = new THREE.LineBasicMaterial({
            color: 0x334455,
            transparent: true,
            opacity: 0.3
        });
        var half = GRID_SIZE / 2;
        for (var i = 0; i <= GRID_SIZE; i++) {
            var z = i - half;
            gridGroup.add(new THREE.Line(
                new THREE.BufferGeometry().setFromPoints([
                    new THREE.Vector3(-half, 0.01, z),
                    new THREE.Vector3(half, 0.01, z)
                ]), lineMaterial
            ));
        }
        for (var i = 0; i <= GRID_SIZE; i++) {
            var x = i - half;
            gridGroup.add(new THREE.Line(
                new THREE.BufferGeometry().setFromPoints([
                    new THREE.Vector3(x, 0.01, -half),
                    new THREE.Vector3(x, 0.01, half)
                ]), lineMaterial
            ));
        }
        scene.add(gridGroup);
    }

    function gameToWorld(gx, gz, y) {
        return new THREE.Vector3(gx - CENTER_OFFSET, y || 0, gz - CENTER_OFFSET);
    }

    function createSnakeSegment(isHead, colorOverride) {
        var size = 0.85;
        var geometry = new THREE.BoxGeometry(size, size * 0.7, size);
        var color = colorOverride || (isHead ? HEAD_COLOR : BODY_COLOR);
        var material = new THREE.MeshStandardMaterial({
            color: color,
            roughness: 0.3,
            metalness: 0.4,
            emissive: isHead ? color : 0x000000,
            emissiveIntensity: isHead ? 0.6 : 0
        });
        var mesh = new THREE.Mesh(geometry, material);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        return mesh;
    }

    function createFoodMesh() {
        var geometry = new THREE.OctahedronGeometry(0.35, 0);
        var material = new THREE.MeshStandardMaterial({
            color: FOOD_COLOR,
            roughness: 0.2,
            metalness: 0.5,
            emissive: FOOD_COLOR,
            emissiveIntensity: 0.8
        });
        var mesh = new THREE.Mesh(geometry, material);
        mesh.castShadow = true;
        mesh.position.y = FOOD_Y;
        return mesh;
    }

    function spawnParticles(worldPos) {
        var count = 12;
        var particleGroup = new THREE.Group();
        for (var i = 0; i < count; i++) {
            var size = 0.05 + Math.random() * 0.1;
            var geometry = new THREE.SphereGeometry(size, 4, 4);
            var hue = Math.random();
            var color = new THREE.Color().setHSL(hue, 0.8, 0.6);
            var material = new THREE.MeshBasicMaterial({ color: color });
            var particle = new THREE.Mesh(geometry, material);
            particle.position.copy(worldPos);
            particle.userData = {
                velocity: new THREE.Vector3(
                    (Math.random() - 0.5) * 3,
                    Math.random() * 3 + 1,
                    (Math.random() - 0.5) * 3
                ),
                life: 1.0
            };
            particleGroup.add(particle);
        }
        scene.add(particleGroup);
        particles.push({ group: particleGroup, age: 0, maxAge: 0.5 });
    }

    function update(gameState) {
        if (!gameState || !gameState.snake) return;
        updateSnake(gameState.snake);
        updateFood(gameState.food);
        updateParticles();
    }

    function updateSnake(snakeData) {
        snakeMeshes.forEach(function(m) { scene.remove(m); });
        snakeMeshes = [];
        var len = snakeData.length;
        snakeData.forEach(function(seg, i) {
            var mesh;
            if (i === 0) {
                mesh = createSnakeSegment(true);
                if (i < len - 1) {
                    var next = snakeData[i + 1];
                    var dx = seg.x - next.x;
                    var dz = seg.z - next.z;
                    if (dx !== 0) mesh.rotation.y = dx > 0 ? 0 : Math.PI;
                    else if (dz !== 0) mesh.rotation.y = dz > 0 ? -Math.PI / 2 : Math.PI / 2;
                }
            } else {
                var t = i / (len - 1);
                var r = 0x4c + Math.floor(t * 0x2e);
                var g = 0xaf - Math.floor(t * 0x40);
                var b = 0x50 - Math.floor(t * 0x20);
                mesh = createSnakeSegment(false, (r << 16) | (g << 8) | b);
            }
            mesh.position.copy(gameToWorld(seg.x, seg.z, SNAKE_Y));
            scene.add(mesh);
            snakeMeshes.push(mesh);
        });
    }

    function updateFood(foodData) {
        if (foodMesh) { scene.remove(foodMesh); foodMesh = null; }
        if (foodData) {
            foodMesh = createFoodMesh();
            foodMesh.position.copy(gameToWorld(foodData.x, foodData.z, FOOD_Y));
            scene.add(foodMesh);
        }
    }

    function updateParticles() {
        var dt = 0.016;
        var toRemove = [];
        particles.forEach(function(p, index) {
            p.age += dt;
            if (p.age >= p.maxAge) {
                scene.remove(p.group);
                toRemove.push(index);
                return;
            }
            var progress = p.age / p.maxAge;
            p.group.children.forEach(function(particle) {
                particle.position.x += particle.userData.velocity.x * dt;
                particle.position.y += particle.userData.velocity.y * dt;
                particle.position.z += particle.userData.velocity.z * dt;
                particle.userData.velocity.y -= 6 * dt;
                particle.material.opacity = 1 - progress;
                particle.material.transparent = true;
                particle.scale.setScalar(1 - progress * 0.5);
            });
        });
        toRemove.reverse().forEach(function(i) { particles.splice(i, 1); });
    }

    function emitFoodParticles(foodPos) {
        if (foodPos) spawnParticles(gameToWorld(foodPos.x, foodPos.z, FOOD_Y));
    }

    function startRenderLoop() {
        function animate() {
            animationId = requestAnimationFrame(animate);
            if (foodMesh) {
                foodMesh.rotation.y += 0.02;
                foodMesh.rotation.x += 0.01;
                foodMesh.position.y = FOOD_Y + Math.sin(Date.now() * 0.003) * 0.1;
            }
            renderer.render(scene, camera);
        }
        animate();
    }

    function stopRenderLoop() {
        if (animationId) { cancelAnimationFrame(animationId); animationId = null; }
    }

    function onResize() {
        var container = renderer.domElement.parentElement;
        if (!container) return;
        camera.aspect = container.clientWidth / container.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(container.clientWidth, container.clientHeight);
    }

    function dispose() {
        stopRenderLoop();
        if (renderer) {
            renderer.dispose();
            if (renderer.domElement.parentElement) {
                renderer.domElement.parentElement.removeChild(renderer.domElement);
            }
        }
        window.removeEventListener('resize', onResize);
    }

    return {
        init: init,
        update: update,
        startRenderLoop: startRenderLoop,
        stopRenderLoop: stopRenderLoop,
        emitFoodParticles: emitFoodParticles,
        dispose: dispose
    };
})();
