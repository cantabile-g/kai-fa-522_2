/**
 * scene.js — Snake3D Three.js 场景渲染（支持地图/主题/障碍/道具）
 *
 * [成员B — 3D 场景渲染]
 */

var Scene3D = (function () {
    'use strict';

    var scene, camera, renderer;
    var snakeMeshes1 = [], snakeMeshes2 = [];
    var foodMesh = null;
    var gridGroup = null, floorPlane = null;
    var obstacleMeshes = [], itemMeshes = [], portalMeshes = [];
    var particles = [];
    var animationId = null;
    var currentTheme = 'dark';
    var currentGridSize = 18;
    var sceneryGroup = null;  // 场景装饰物组
    var starfieldGroup = null;  // 动态星星背景
    var CENTER_OFFSET = 8.5;
    var SNAKE_Y = 0.25, FOOD_Y = 0.4;

    var HEAD_COLOR_1 = 0xffd700, BODY_COLOR_1 = 0x4caf50;
    var HEAD_COLOR_2 = 0xffd700, BODY_COLOR_2 = 0x2196F3;
    var FOOD_COLOR = 0xff4444;

    // 主题配置: {bg, fogColor, floorColor, gridColor, ambientColor}
    var THEMES = {
        'dark':   { bg: 0x0a0a1a, fog: 0x0a0a1a, floor: 0x1a1a2e, grid: 0x334455, ambient: 0x404060, name: '经典暗黑' },
        'green':  { bg: 0x0a1a0a, fog: 0x0a1a0a, floor: 0x1a2e1a, grid: 0x335533, ambient: 0x406040, name: '森林草地' },
        'desert': { bg: 0x1a150a, fog: 0x1a150a, floor: 0x2e251a, grid: 0x554433, ambient: 0x605040, name: '沙漠荒原' },
        'ice':    { bg: 0x0a1a2a, fog: 0x0a1a2a, floor: 0x1a2a3e, grid: 0x334466, ambient: 0x406080, name: '冰原寒地' }
    };

    function init(container) {
        scene = new THREE.Scene();
        applyTheme(currentTheme);

        var aspect = container.clientWidth / container.clientHeight;
        camera = new THREE.PerspectiveCamera(50, aspect, 0.5, 200);
        updateCameraForGridSize(currentGridSize);

        renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(container.clientWidth, container.clientHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
        renderer.shadowMap.enabled = true;
        container.appendChild(renderer.domElement);

        var theme = THEMES[currentTheme] || THEMES['dark'];
        var ambientLight = new THREE.AmbientLight(theme.ambient, 0.8);
        scene.add(ambientLight);

        var dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
        dirLight.position.set(10, 20, 5);
        dirLight.castShadow = true;
        dirLight.shadow.mapSize.width = 512;
        dirLight.shadow.mapSize.height = 512;
        dirLight.shadow.camera.near = 0.5;
        dirLight.shadow.camera.far = 60;
        dirLight.shadow.camera.left = -15;
        dirLight.shadow.camera.right = 15;
        dirLight.shadow.camera.top = 15;
        dirLight.shadow.camera.bottom = -15;
        scene.add(dirLight);

        rebuildFloorAndGrid(currentGridSize);
        createStarfield();
        window.addEventListener('resize', onResize);
    }

    function applyTheme(themeName) {
        currentTheme = themeName;
        var t = THEMES[themeName] || THEMES['dark'];
        if (scene) {
            scene.background = new THREE.Color(t.bg);
            scene.fog = new THREE.Fog(t.fog, 20, 60);
        } else {
            if (scene) scene.background = new THREE.Color(t.bg);
        }
    }

    function setGridSize(size) {
        currentGridSize = size;
        CENTER_OFFSET = (size - 1) / 2;
        updateCameraForGridSize(size);
        rebuildFloorAndGrid(size);
    }

    function updateCameraForGridSize(size) {
        if (!camera) return;
        // 相机高度和距离根据地图大小自动调整
        var camDist = size * 0.9;
        var camHeight = size * 0.95;
        camera.position.set(camDist, camHeight, camDist);
        camera.lookAt(0, 0, 0);
        // 雾距调整
        if (scene && scene.fog) {
            scene.fog.near = camDist * 1.2;
            scene.fog.far = camDist * 3.5;
        }
    }

    function rebuildFloorAndGrid(size) {
        if (floorPlane) scene.remove(floorPlane);
        if (gridGroup) scene.remove(gridGroup);

        var t = THEMES[currentTheme] || THEMES['dark'];
        var geometry = new THREE.PlaneGeometry(size + 2, size + 2);
        var material = new THREE.MeshStandardMaterial({
            color: t.floor, roughness: 0.9, metalness: 0.1
        });
        floorPlane = new THREE.Mesh(geometry, material);
        floorPlane.rotation.x = -Math.PI / 2;
        floorPlane.position.y = -0.1;
        floorPlane.receiveShadow = true;
        scene.add(floorPlane);

        gridGroup = new THREE.Group();
        var lineMaterial = new THREE.LineBasicMaterial({
            color: t.grid, transparent: true, opacity: 0.3
        });
        var half = size / 2;
        for (var i = 0; i <= size; i++) {
            var z = i - half;
            gridGroup.add(new THREE.Line(
                new THREE.BufferGeometry().setFromPoints([
                    new THREE.Vector3(-half, 0.01, z), new THREE.Vector3(half, 0.01, z)
                ]), lineMaterial));
        }
        for (var i = 0; i <= size; i++) {
            var x = i - half;
            gridGroup.add(new THREE.Line(
                new THREE.BufferGeometry().setFromPoints([
                    new THREE.Vector3(x, 0.01, -half), new THREE.Vector3(x, 0.01, half)
                ]), lineMaterial));
        }
        scene.add(gridGroup);
        createScenery(size);
    }

    function createScenery(size) {
        if (sceneryGroup) scene.remove(sceneryGroup);
        sceneryGroup = new THREE.Group();
        var half = size / 2;
        var tName = currentTheme;

        if (tName === 'green') {
            // 草地：散布小草丛
            for (var i = 0; i < Math.floor(size * 1.5); i++) {
                var g = new THREE.ConeGeometry(0.12, 0.3, 4);
                var m = new THREE.MeshStandardMaterial({ color: 0x2d5a1e, roughness: 0.8 });
                var tuft = new THREE.Mesh(g, m);
                tuft.position.set(
                    (Math.random() - 0.5) * size, 0.15,
                    (Math.random() - 0.5) * size
                );
                tuft.receiveShadow = true;
                sceneryGroup.add(tuft);
            }
        } else if (tName === 'desert') {
            // 沙漠：随机沙丘
            for (var i = 0; i < Math.floor(size * 0.8); i++) {
                var g = new THREE.SphereGeometry(0.2 + Math.random() * 0.3, 4, 3, 0, Math.PI * 2, 0, Math.PI / 2);
                var m = new THREE.MeshStandardMaterial({ color: 0x8B7355, roughness: 1.0 });
                var dune = new THREE.Mesh(g, m);
                dune.position.set(
                    (Math.random() - 0.5) * size * 0.9, 0,
                    (Math.random() - 0.5) * size * 0.9
                );
                dune.receiveShadow = true;
                sceneryGroup.add(dune);
            }
        } else if (tName === 'ice') {
            // 冰原：冰晶柱
            for (var i = 0; i < Math.floor(size * 0.6); i++) {
                var g = new THREE.CylinderGeometry(0.05, 0.15, 0.5 + Math.random() * 0.5, 5);
                var m = new THREE.MeshStandardMaterial({
                    color: 0x88ccff, roughness: 0.1, metalness: 0.3,
                    emissive: 0x112244, emissiveIntensity: 0.3,
                    transparent: true, opacity: 0.7
                });
                var crystal = new THREE.Mesh(g, m);
                crystal.position.set(
                    (Math.random() - 0.5) * size * 0.9, 0.2,
                    (Math.random() - 0.5) * size * 0.9
                );
                sceneryGroup.add(crystal);
            }
        } else {
            // 暗黑：四角发光柱
            var glowGeo = new THREE.CylinderGeometry(0.1, 0.1, 1.5, 8);
            var glowMat = new THREE.MeshStandardMaterial({
                color: 0x334466, roughness: 0.1, metalness: 0.8,
                emissive: 0x112244, emissiveIntensity: 0.8
            });
            var corners = [[-half+0.5, -half+0.5], [half-0.5, -half+0.5], [-half+0.5, half-0.5], [half-0.5, half-0.5]];
            corners.forEach(function(c) {
                var pillar = new THREE.Mesh(glowGeo, glowMat);
                pillar.position.set(c[0], 0.75, c[1]);
                sceneryGroup.add(pillar);
            });
        }
        scene.add(sceneryGroup);
    }

    function createStarfield() {
        if (starfieldGroup) scene.remove(starfieldGroup);
        starfieldGroup = new THREE.Group();
        var geo = new THREE.SphereGeometry(0.08, 3, 3);
        var mat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.6 });
        for (var i = 0; i < 60; i++) {
            var star = new THREE.Mesh(geo, mat.clone());
            star.position.set(
                (Math.random() - 0.5) * 40,
                3 + Math.random() * 15,
                (Math.random() - 0.5) * 40
            );
            star.userData = { speed: 0.005 + Math.random() * 0.02, baseY: star.position.y };
            starfieldGroup.add(star);
        }
        scene.add(starfieldGroup);
    }

    function gameToWorld(gx, gz, y) {
        return new THREE.Vector3(gx - CENTER_OFFSET, y || 0, gz - CENTER_OFFSET);
    }

    function createSnakeSegment(isHead, headColor, bodyColor) {
        var size = 0.85;
        var geometry = new THREE.BoxGeometry(size, size * 0.7, size);
        var color = isHead ? (headColor || HEAD_COLOR_1) : (bodyColor || BODY_COLOR_1);
        var material = new THREE.MeshStandardMaterial({
            color: color, roughness: 0.3, metalness: 0.4,
            emissive: isHead ? color : 0x000000, emissiveIntensity: isHead ? 0.6 : 0
        });
        var mesh = new THREE.Mesh(geometry, material);
        mesh.castShadow = true; mesh.receiveShadow = true;
        return mesh;
    }

    function createFoodMesh() {
        var g = new THREE.OctahedronGeometry(0.35, 0);
        var m = new THREE.MeshStandardMaterial({
            color: FOOD_COLOR, roughness: 0.2, metalness: 0.5,
            emissive: FOOD_COLOR, emissiveIntensity: 0.8
        });
        var mesh = new THREE.Mesh(g, m);
        mesh.castShadow = true; mesh.position.y = FOOD_Y;
        return mesh;
    }

    var ITEM_COLORS = { speed: 0x00E5FF, slow: 0xFF6D00, shield: 0xAA00FF, double: 0xFFEA00 };

    function createObstacleMesh(worldPos) {
        var g = new THREE.BoxGeometry(0.8, 0.5, 0.8);
        var m = new THREE.MeshStandardMaterial({ color: 0x555555, roughness: 0.7, metalness: 0.2 });
        var mesh = new THREE.Mesh(g, m);
        mesh.position.copy(worldPos);
        mesh.position.y = 0.25;
        mesh.castShadow = true; mesh.receiveShadow = true;
        return mesh;
    }

    function createItemMesh(type, worldPos) {
        var g = new THREE.TorusGeometry(0.25, 0.08, 8, 8);
        var col = ITEM_COLORS[type] || 0xffffff;
        var m = new THREE.MeshStandardMaterial({
            color: col, roughness: 0.2, metalness: 0.6, emissive: col, emissiveIntensity: 0.5
        });
        var mesh = new THREE.Mesh(g, m);
        mesh.position.copy(worldPos);
        mesh.position.y = 0.4;
        mesh.userData = { itemType: type };
        return mesh;
    }

    function spawnParticles(worldPos, colorHint) {
        var count = 12;
        var group = new THREE.Group();
        for (var i = 0; i < count; i++) {
            var size = 0.05 + Math.random() * 0.1;
            var g = new THREE.SphereGeometry(size, 4, 4);
            var hue = colorHint !== undefined ? (colorHint + Math.random() * 0.1) : Math.random();
            var col = new THREE.Color().setHSL(hue % 1, 0.8, 0.6);
            var mat = new THREE.MeshBasicMaterial({ color: col });
            var p = new THREE.Mesh(g, mat);
            p.position.copy(worldPos);
            p.userData = { velocity: new THREE.Vector3((Math.random()-0.5)*3, Math.random()*3+1, (Math.random()-0.5)*3), life: 1.0 };
            group.add(p);
        }
        scene.add(group);
        particles.push({ group: group, age: 0, maxAge: 0.5 });
    }

    function update(gameState) {
        if (!gameState) return;

        // 检测地图大小/主题变化
        if (gameState.gridSize && gameState.gridSize !== currentGridSize) setGridSize(gameState.gridSize);
        if (gameState.theme && gameState.theme !== currentTheme) applyTheme(gameState.theme);

        updateSnake(gameState.snake || [], snakeMeshes1, HEAD_COLOR_1, BODY_COLOR_1, gameState.isGhost1);
        if (gameState.mode === 'twoPlayer') {
            updateSnake(gameState.snake2 || [], snakeMeshes2, HEAD_COLOR_2, BODY_COLOR_2, gameState.isGhost2);
        } else {
            updateSnake([], snakeMeshes2, HEAD_COLOR_2, BODY_COLOR_2);
        }
        updateFood(gameState.food);
        updateObstacles(gameState.obstacles || []);
        updateItems(gameState.items || []);
        updatePortals(gameState);
        updateParticles();
    }

    function updateSnake(snakeData, meshArray, headColor, bodyColor, isGhost) {
        meshArray.forEach(function(m) { scene.remove(m); });
        meshArray.length = 0;
        if (!snakeData || snakeData.length === 0) return;
        var len = snakeData.length;
        snakeData.forEach(function(seg, i) {
            var mesh;
            if (i === 0) {
                mesh = createSnakeSegment(true, headColor, bodyColor);
                if (i < len - 1) {
                    var next = snakeData[i+1];
                    var dx = seg.x - next.x, dz = seg.z - next.z;
                    if (dx !== 0) mesh.rotation.y = dx > 0 ? 0 : Math.PI;
                    else if (dz !== 0) mesh.rotation.y = dz > 0 ? -Math.PI/2 : Math.PI/2;
                }
            } else {
                var t = i / (len-1);
                var bc = new THREE.Color(bodyColor);
                var df = 0.6 + 0.4*(1-t);
                var r = Math.floor(bc.r*255*df), g = Math.floor(bc.g*255*df), b = Math.floor(bc.b*255*df);
                mesh = createSnakeSegment(false, headColor, (r<<16)|(g<<8)|b);
            }
            if (isGhost) {
                mesh.material.transparent = true;
                mesh.material.opacity = 0.35;
                mesh.material.emissive = new THREE.Color(0xffffff);
                mesh.material.emissiveIntensity = 0.5;
            }
            mesh.position.copy(gameToWorld(seg.x, seg.z, SNAKE_Y));
            scene.add(mesh);
            meshArray.push(mesh);
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

    function updateObstacles(obsData) {
        obstacleMeshes.forEach(function(m) { scene.remove(m); });
        obstacleMeshes = [];
        obsData.forEach(function(o) {
            var mesh = createObstacleMesh(gameToWorld(o.x, o.z, 0));
            scene.add(mesh);
            obstacleMeshes.push(mesh);
        });
    }

    function updatePortals(gameState) {
        portalMeshes.forEach(function(m) { scene.remove(m); });
        portalMeshes = [];
        var portals = [];
        if (gameState.portals) portals = gameState.portals;
        else if (GameEngine && GameEngine.getPortals) portals = GameEngine.getPortals();
        portals.forEach(function(p) {
            var g = new THREE.TorusGeometry(0.4, 0.08, 8, 16);
            var m = new THREE.MeshStandardMaterial({
                color: 0x00ffff, roughness: 0.1, metalness: 0.5,
                emissive: 0x0088ff, emissiveIntensity: 1.0
            });
            var mesh = new THREE.Mesh(g, m);
            mesh.position.copy(gameToWorld(p.x, p.z, 0.3));
            mesh.userData = { type: 'portal' };
            scene.add(mesh);
            portalMeshes.push(mesh);
        });
    }

    function updateItems(itemsData) {
        itemMeshes.forEach(function(m) { scene.remove(m); });
        itemMeshes = [];
        itemsData.forEach(function(it) {
            var mesh = createItemMesh(it.type, gameToWorld(it.x, it.z, 0));
            scene.add(mesh);
            itemMeshes.push(mesh);
        });
    }

    function updateParticles() {
        var dt = 0.016, toRemove = [];
        particles.forEach(function(p, idx) {
            p.age += dt;
            if (p.age >= p.maxAge) { scene.remove(p.group); toRemove.push(idx); return; }
            var prog = p.age / p.maxAge;
            p.group.children.forEach(function(pt) {
                pt.position.x += pt.userData.velocity.x * dt;
                pt.position.y += pt.userData.velocity.y * dt;
                pt.position.z += pt.userData.velocity.z * dt;
                pt.userData.velocity.y -= 6 * dt;
                pt.material.opacity = 1 - prog;
                pt.material.transparent = true;
                pt.scale.setScalar(1 - prog * 0.5);
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
                foodMesh.rotation.y += 0.02; foodMesh.rotation.x += 0.01;
                foodMesh.position.y = FOOD_Y + Math.sin(Date.now()*0.003)*0.1;
            }
            itemMeshes.forEach(function(m) {
                m.rotation.z += 0.03; m.rotation.x += 0.02;
                m.position.y = 0.4 + Math.sin(Date.now()*0.004 + m.position.x)*0.15;
            });
            // 动态星星
            if (starfieldGroup) {
                starfieldGroup.children.forEach(function(s) {
                    s.position.y = s.userData.baseY + Math.sin(Date.now()*0.001 + s.position.x)*2;
                    s.material.opacity = 0.3 + 0.4 * Math.abs(Math.sin(Date.now()*0.002 + s.position.z));
                });
            }
            portalMeshes.forEach(function(m) {
                m.rotation.z += 0.04; m.rotation.x += 0.03;
                m.position.y = 0.3 + Math.sin(Date.now()*0.005 + m.position.x)*0.2;
            });
            renderer.render(scene, camera);
        }
        animate();
    }

    function stopRenderLoop() {
        if (animationId) { cancelAnimationFrame(animationId); animationId = null; }
    }

    function onResize() {
        var c = renderer.domElement.parentElement;
        if (!c) return;
        camera.aspect = c.clientWidth / c.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(c.clientWidth, c.clientHeight);
    }

    function dispose() {
        stopRenderLoop();
        if (renderer) { renderer.dispose(); if (renderer.domElement.parentElement) renderer.domElement.parentElement.removeChild(renderer.domElement); }
        window.removeEventListener('resize', onResize);
    }

    return {
        init: init, update: update, startRenderLoop: startRenderLoop,
        stopRenderLoop: stopRenderLoop, emitFoodParticles: emitFoodParticles, dispose: dispose
    };
})();
