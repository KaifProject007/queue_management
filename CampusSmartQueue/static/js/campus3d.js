/**
 * Campus SmartQueue 2.0 - Hyper-Realistic Architectural 3D Digital Twin
 * Directly calibrated to AISSMS Pune Satellite Top View & Real Ground Photos
 * 
 * Master Real-World Layout:
 * Building 1: AISSMS College of Engineering (COE) - Primary Focus
 *             Contains: Central Library, Student Section & Exam Cell, Central Admission Office
 *             Features: Red Entrance Portal Archway, Subterranean Ramp under Fighter Jet
 * Fighter Jet Memorial: Vintage IAF Fighter Jet on 4-pillar concrete bridge pedestal with IAF roundels
 * Building 2: AISSMS Institute of Management (MBA College)
 *             Features: Symmetrical Grand Entrance Stairs, Top Yellow Cantilever Frame
 *             Contains: Xerox & Reprographic Centre ("X") specifically at Ground Parking Level
 * Building 3: AISSMS College of Pharmacy
 *             Features: Stepped Gabled Roof, Signature Peach Cylindrical Oriel Window, Parking Ramp
 * Building 4: AISSMS Institute of Information Technology (IOIT)
 *             Features: 8-Story Computing Tower, Curved Orange Auditorium Pavilion
 *             Statue Plaza: Chhatrapati Shivaji Maharaj Heroic Bronze Statue on Black Granite Plinth
 * Central Canteen: Quadrangle Dining Court with timber pergolas & outdoor seating
 * 
 * Interactive Controls:
 * - 360° OrbitControls (Rotate, Zoom, Pan)
 * - 🎬 1-Click Evaluator Drone Tour (Smoothly flies camera across landmarks)
 * - 🔄 Default Perspective View
 * - 🗺️ Top-Down Aerial 2D Blueprint (matches Google Maps Satellite)
 * - 🌙 Day / Night Lighting Mode
 * - Interactive SmartQueue holographic status rings & dynamic billboards
 */

class Campus3DScene {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        if (!this.container) return;

        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        this.buildings = [];
        this.landmarkBadges = [];
        this.particles = null;
        this.sprinklers = [];
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        this.hoveredBuilding = null;
        this.isNightMode = true;

        // Auto-Tour state
        this.isTourRunning = false;
        this.tourStep = 0;
        this.tourTimer = null;

        // Real-world calibrated locations based on ground-truth drone aerial photo:
        // Building 1 (COE): Academic center-back behind Fighter Jet
        // Building 2 (MBA): West wing forward, with Xerox Center [X] at ground parking arcade
        // Central Canteen: Relocated to extreme bottom-left pavilion across from MBA
        // Central Lawn: Pristine open green lawn centered in front of the Jet
        this.facilities = [
            { id: 1, name: "COE Admission Office", fullTitle: "COE Central Admission Office (Bldg 1 - Ground Floor)", x: -2.2, z: -7.5, color: 0x991b1b, bldgNum: 1, type: "coe_admin" },
            { id: 2, name: "COE Student Section", fullTitle: "COE Student Section & Exam Cell (Bldg 1 - Windows 1-4)", x: 3.8, z: -7.5, color: 0x1e3a8a, bldgNum: 1, type: "coe_student" },
            { id: 3, name: "Central Canteen", fullTitle: "AISSMS Central Canteen (Extreme Bottom-Left Dining Court)", x: -17.5, z: 12.0, color: 0xd97706, bldgNum: 0, type: "canteen" },
            { id: 4, name: "Xerox Centre [X]", fullTitle: "MBA Parking Xerox Center [X] (Bldg 2 Ground Parking)", x: -14.5, z: 3.2, color: 0x059669, bldgNum: 2, type: "xerox_mba" },
            { id: 5, name: "Hostel Dining & Mess", fullTitle: "Hostel Dining & Mess (Residential Block)", x: -21.0, z: -5.0, color: 0x9333ea, bldgNum: 0, type: "mess" },
            { id: 6, name: "COE Central Library", fullTitle: "COE Dr. B. D. Patil Central Library (Bldg 1 - 2nd/3rd Floor)", x: 0.8, z: -7.5, color: 0x0891b2, bldgNum: 1, type: "coe_library" }
        ];

        this.init();
    }

    init() {
        const width = this.container.clientWidth;
        const height = this.container.clientHeight;

        // 1. Scene setup
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x070a13);
        this.scene.fog = new THREE.FogExp2(0x070a13, 0.016);

        // 2. Camera setup - Looking from South across the quad and jet towards COE
        this.camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 1000);
        this.camera.position.set(0, 25, 34);

        // 3. WebGL Renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
        this.renderer.setSize(width, height);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.container.appendChild(this.renderer.domElement);

        // 4. OrbitControls
        if (typeof THREE.OrbitControls !== "undefined") {
            this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
            this.controls.enableDamping = true;
            this.controls.dampingFactor = 0.08;
            this.controls.maxPolarAngle = Math.PI / 2.12;
            this.controls.minDistance = 8;
            this.controls.maxDistance = 80;
            this.controls.target.set(0, 2, 0);
        }

        // 5. Environmental Lighting
        this.setupLighting();

        // 6. Master Campus Grounds & Paved Pathways
        this.buildRealisticGrounds();

        // 7. Landmark: Iconic IAF Fighter Jet Monument & Bridge Pedestal
        this.buildFighterJetMonument();

        // 8. Landmark: Chhatrapati Shivaji Maharaj Statue Memorial Plaza
        this.buildShivajiStatueMemorial();

        // 9. Building 1: AISSMS College of Engineering (COE) Main 4-Story Academic Wing
        this.buildBuilding1_COE();

        // 10. Building 2: AISSMS Institute of Management (MBA) + Xerox Centre [X]
        this.buildBuilding2_MBA();

        // 11. Building 3: AISSMS College of Pharmacy (Peach Cylindrical Oriel Bay)
        this.buildBuilding3_Pharmacy();

        // 12. Building 4: AISSMS Institute of Information Technology (IOIT) Tower & Auditorium
        this.buildBuilding4_IOIT();

        // 13. Central Canteen & Hostel Mess Pavilions
        this.buildCentralCanteenAndMess();

        // 14. Campus Context: Industrial Sawtooth Workshops & Sports Ground
        this.buildWorkshopShedsAndGround();

        // 15. Real-time Holographic Billboards & Floor Rings
        this.buildFacilityBillboards();

        // 16. Dynamic Effects: Student Flow Particles & Working Sprinklers
        this.buildDynamicEffects();

        // 17. Event Listeners
        window.addEventListener("resize", () => this.onResize());
        this.container.addEventListener("mousemove", (e) => this.onMouseMove(e));
        this.container.addEventListener("click", () => this.onClick());
        this.setupScrollZoomInteraction();

        // 18. Start Animation Loop
        this.animate();
    }

    setupLighting() {
        this.ambientLight = new THREE.AmbientLight(0xffffff, 0.70);
        this.scene.add(this.ambientLight);

        // Pune Sunlight
        this.sunLight = new THREE.DirectionalLight(0xfff7ed, 1.45);
        this.sunLight.position.set(24, 40, 26);
        this.sunLight.castShadow = true;
        this.sunLight.shadow.mapSize.width = 2048;
        this.sunLight.shadow.mapSize.height = 2048;
        this.sunLight.shadow.camera.near = 0.5;
        this.sunLight.shadow.camera.far = 130;
        this.sunLight.shadow.camera.left = -32;
        this.sunLight.shadow.camera.right = 32;
        this.sunLight.shadow.camera.top = 32;
        this.sunLight.shadow.camera.bottom = -32;
        this.scene.add(this.sunLight);

        // Sky Fill Light
        this.skyFillLight = new THREE.DirectionalLight(0x38bdf8, 0.45);
        this.skyFillLight.position.set(-22, 26, -22);
        this.scene.add(this.skyFillLight);

        // Night / Accent Spotlights
        this.jetSpot = new THREE.PointLight(0xf97316, 2.5, 20);
        this.jetSpot.position.set(0, 4.2, -0.6);
        this.scene.add(this.jetSpot);

        this.statueSpot = new THREE.PointLight(0xfbbf24, 2.4, 20);
        this.statueSpot.position.set(12.5, 4.0, 3.5);
        this.scene.add(this.statueSpot);

        // Spot illuminating the Xerox Centre [X] inside the MBA ground parking undercroft
        this.xeroxSpot = new THREE.PointLight(0x10b981, 3.2, 16);
        this.xeroxSpot.position.set(-14.5, 1.8, 3.2);
        this.scene.add(this.xeroxSpot);
    }

    buildRealisticGrounds() {
        // Base Foundation Slab
        const baseGeo = new THREE.BoxGeometry(54, 0.6, 42);
        const baseMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.9, metalness: 0.1 });
        const baseMesh = new THREE.Mesh(baseGeo, baseMat);
        baseMesh.position.y = -0.3;
        baseMesh.receiveShadow = true;
        this.scene.add(baseMesh);

        // 1. AISSMS Central Engineering Quadrangle Lawn (Pristine, completely unobstructed in front of the Jet!)
        // Matches exact dimensions from drone aerial photo media_1792486959337_b028c5f7.jpg
        const lawnMat = new THREE.MeshStandardMaterial({ color: 0x1b431e, roughness: 0.85 });
        const mainLawn = new THREE.Mesh(new THREE.BoxGeometry(14.0, 0.12, 8.5), lawnMat);
        mainLawn.position.set(-1.0, 0.06, 5.0);
        mainLawn.receiveShadow = true;
        this.scene.add(mainLawn);

        // Terracotta Red Interlocking Paver Track around Main Lawn
        const paverMat = new THREE.MeshStandardMaterial({ color: 0x9a3412, roughness: 0.7 });
        const pathBorder = new THREE.Mesh(new THREE.BoxGeometry(15.5, 0.08, 10.0), paverMat);
        pathBorder.position.set(-1.0, 0.04, 5.0);
        this.scene.add(pathBorder);

        // Decorative Low Hedge along Lawn Perimeter
        const hedgeMat = new THREE.MeshStandardMaterial({ color: 0x14532d, roughness: 0.8 });
        const hSouth = new THREE.Mesh(new THREE.BoxGeometry(13.6, 0.25, 0.35), hedgeMat);
        hSouth.position.set(-1.0, 0.15, 9.1);
        this.scene.add(hSouth);
        const hNorth = new THREE.Mesh(new THREE.BoxGeometry(13.6, 0.25, 0.35), hedgeMat);
        hNorth.position.set(-1.0, 0.15, 0.9);
        this.scene.add(hNorth);

        // 2. Southeast Statue Quad Lawn (in front of IOIT & Statue Plaza)
        const southLawn = new THREE.Mesh(new THREE.BoxGeometry(8.5, 0.12, 7.5), lawnMat);
        southLawn.position.set(13.5, 0.06, 6.5);
        southLawn.receiveShadow = true;
        this.scene.add(southLawn);

        // 3. AISSMS College Sports Ground (Far West side turf)
        const sportsGroundMat = new THREE.MeshStandardMaterial({ color: 0x24331e, roughness: 0.95 });
        const sportsGround = new THREE.Mesh(new THREE.BoxGeometry(11, 0.08, 14), sportsGroundMat);
        sportsGround.position.set(-21, 0.04, -2.0);
        this.scene.add(sportsGround);

        // 4. Campus Roads & Pedestrian Streets (calibrated to drone aerial)
        const roadMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.8 });
        
        // South Campus Boulevard (Wide main road running along the front of Lawn & MBA)
        const southAvenue = new THREE.Mesh(new THREE.BoxGeometry(52, 0.05, 4.2), roadMat);
        southAvenue.position.set(0, 0.03, 11.2);
        this.scene.add(southAvenue);

        // North-South Boulevard between Building 2 (MBA) and Central Lawn
        const westAvenue = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.05, 26), roadMat);
        westAvenue.position.set(-9.8, 0.03, 1.5);
        this.scene.add(westAvenue);

        // North-South Driveway between Lawn and Pharmacy/IOIT
        const eastAvenue = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.05, 26), roadMat);
        eastAvenue.position.set(7.5, 0.03, 1.5);
        this.scene.add(eastAvenue);

        // Jet Promenade Plaza between Lawn and COE
        const jetPlazaRoad = new THREE.Mesh(new THREE.BoxGeometry(26, 0.05, 3.4), roadMat);
        jetPlazaRoad.position.set(-0.5, 0.03, -1.0);
        this.scene.add(jetPlazaRoad);

        // 5. Parked Cars along South Boulevard (matching the real drone photo!)
        const carConfigs = [
            { x: -7.5, z: 10.6, color: 0xdc2626, rot: 0 },    // Red hatchback
            { x: -5.5, z: 10.6, color: 0xf8fafc, rot: 0 },    // White sedan
            { x: -3.5, z: 10.6, color: 0x64748b, rot: 0 },    // Silver sedan
            { x: -1.5, z: 10.6, color: 0x0f172a, rot: 0 },    // Dark blue hatchback
            { x: 0.5,  z: 10.6, color: 0xe2e8f0, rot: 0 },    // White SUV
            { x: 2.5,  z: 10.6, color: 0xb91c1c, rot: 0 },    // Red car
            { x: 4.5,  z: 10.6, color: 0x475569, rot: 0 },    // Grey sedan
            { x: 6.5,  z: 10.6, color: 0x0284c7, rot: 0 }     // Blue hatchback
        ];
        carConfigs.forEach(c => this.createCar(c.x, c.z, c.color, c.rot));

        // Campus Perimeter Trees (along roadsides and edges)
        const treeSpots = [
            [-8.0, 0, 13.5], [-5.0, 0, 13.5], [5.0, 0, 13.5], [8.0, 0, 13.5],
            [-10.2, 0, -2.5], [8.0, 0, -2.5], [-17.5, 0, 8.5], [-14.5, 0, 15.0],
            [17.5, 0, 8.5], [17.5, 0, 14.0], [-10.5, 0, 8.5]
        ];
        treeSpots.forEach(([tx, ty, tz]) => this.createTree(tx, ty, tz));
    }

    createCar(x, z, colorHex, rotY = 0) {
        const carGroup = new THREE.Group();
        carGroup.position.set(x, 0, z);
        carGroup.rotation.y = rotY;

        const bodyMat = new THREE.MeshStandardMaterial({ color: colorHex, roughness: 0.3, metalness: 0.6 });
        const glassMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.1, metalness: 0.9 });
        const wheelMat = new THREE.MeshStandardMaterial({ color: 0x09090b, roughness: 0.8 });

        // Lower chassis
        const chassis = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.42, 2.2), bodyMat);
        chassis.position.y = 0.32;
        chassis.castShadow = true;
        carGroup.add(chassis);

        // Cabin
        const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.36, 1.2), bodyMat);
        cabin.position.set(0, 0.65, -0.15);
        cabin.castShadow = true;
        carGroup.add(cabin);

        // Windows
        const wins = new THREE.Mesh(new THREE.BoxGeometry(1.08, 0.32, 1.15), glassMat);
        wins.position.set(0, 0.65, -0.15);
        carGroup.add(wins);

        // 4 Wheels
        const wGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.14, 8);
        const wOffsets = [
            [-0.6, 0.18, 0.65], [0.6, 0.18, 0.65],
            [-0.6, 0.18, -0.65], [0.6, 0.18, -0.65]
        ];
        wOffsets.forEach(([wx, wy, wz]) => {
            const wheel = new THREE.Mesh(wGeo, wheelMat);
            wheel.rotation.z = Math.PI / 2;
            wheel.position.set(wx, wy, wz);
            carGroup.add(wheel);
        });

        this.scene.add(carGroup);
    }

    createTree(x, y, z) {
        const treeGroup = new THREE.Group();
        const trunk = new THREE.Mesh(
            new THREE.CylinderGeometry(0.12, 0.18, 1.3, 8),
            new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.9 })
        );
        trunk.position.y = 0.65;
        trunk.castShadow = true;
        treeGroup.add(trunk);

        const foliageMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.7 });
        const f1 = new THREE.Mesh(new THREE.SphereGeometry(0.95, 8, 8), foliageMat);
        f1.position.y = 1.7;
        f1.scale.set(1.2, 0.9, 1.2);
        f1.castShadow = true;
        treeGroup.add(f1);

        const f2 = new THREE.Mesh(new THREE.SphereGeometry(0.7, 8, 8), new THREE.MeshStandardMaterial({ color: 0x16a34a, roughness: 0.7 }));
        f2.position.y = 2.3;
        f2.scale.set(1.1, 0.8, 1.1);
        f2.castShadow = true;
        treeGroup.add(f2);

        treeGroup.position.set(x, y, z);
        this.scene.add(treeGroup);
    }

    buildFighterJetMonument() {
        const monumentGroup = new THREE.Group();
        monumentGroup.position.set(-0.5, 0, -1.2); // Forecourt plaza in front of COE & behind the lawn

        // 1. Concrete Stepped Base Plinth
        const plinthMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.8 });
        const plinth = new THREE.Mesh(new THREE.BoxGeometry(7.4, 0.4, 4.8), plinthMat);
        plinth.position.y = 0.2;
        plinth.receiveShadow = true;
        monumentGroup.add(plinth);

        // 2. Concrete Bridge Pedestal with Underpass Ramp (as seen in photo media_1792485662290_d37ff614.png)
        const pillarMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.5 });
        const pOffsets = [
            [-2.5, -1.5], [2.5, -1.5],
            [-2.5, 1.5], [2.5, 1.5]
        ];
        pOffsets.forEach(([px, pz]) => {
            const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.5, 2.3, 0.5), pillarMat);
            pillar.position.set(px, 1.45, pz);
            pillar.castShadow = true;
            monumentGroup.add(pillar);
        });

        // Subterranean Ramp Tunnel Entrance underneath the Jet Bridge
        const rampVoid = new THREE.Mesh(
            new THREE.BoxGeometry(3.6, 1.8, 3.2),
            new THREE.MeshStandardMaterial({ color: 0x090d16, roughness: 0.9 })
        );
        rampVoid.position.set(0, 1.1, 0);
        monumentGroup.add(rampVoid);

        // Elevated Pedestal Deck Platform
        const deckGeo = new THREE.BoxGeometry(6.8, 0.3, 4.4);
        const deck = new THREE.Mesh(deckGeo, pillarMat);
        deck.position.y = 2.65;
        deck.castShadow = true;
        monumentGroup.add(deck);

        // Railings around the elevated fighter jet platform
        const railMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.8 });
        const railFront = new THREE.Mesh(new THREE.BoxGeometry(6.8, 0.45, 0.05), railMat);
        railFront.position.set(0, 3.0, 2.15);
        monumentGroup.add(railFront);

        // 3. Vintage IAF Fighter Jet Aircraft (Hawker Hunter / Canberra profile)
        const jetGroup = new THREE.Group();
        jetGroup.position.set(0, 3.1, 0);

        const jetMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.4, metalness: 0.65 });
        const darkAccentMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.3, metalness: 0.85 });

        // Fuselage body
        const bodyGeo = new THREE.CylinderGeometry(0.42, 0.48, 5.4, 16);
        const body = new THREE.Mesh(bodyGeo, jetMat);
        body.rotation.x = Math.PI / 2;
        body.castShadow = true;
        jetGroup.add(body);

        // Pointed Nosecone
        const noseGeo = new THREE.ConeGeometry(0.42, 1.3, 16);
        const nose = new THREE.Mesh(noseGeo, darkAccentMat);
        nose.rotation.x = -Math.PI / 2;
        nose.position.z = 3.35;
        nose.castShadow = true;
        jetGroup.add(nose);

        // Cockpit Canopy Glass
        const cockpitGeo = new THREE.SphereGeometry(0.38, 16, 12);
        const cockpitMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.1, metalness: 0.9, transparent: true, opacity: 0.85 });
        const cockpit = new THREE.Mesh(cockpitGeo, cockpitMat);
        cockpit.scale.set(0.8, 0.52, 1.8);
        cockpit.position.set(0, 0.42, 1.5);
        jetGroup.add(cockpit);

        // Swept Wings with IAF Tricolor Roundels
        const wingShape = new THREE.Shape();
        wingShape.moveTo(0, 0);
        wingShape.lineTo(3.6, -1.9);
        wingShape.lineTo(3.4, -2.7);
        wingShape.lineTo(0, -1.7);
        wingShape.closePath();

        const extrudeSettings = { depth: 0.08, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02 };
        const rightWingGeo = new THREE.ExtrudeGeometry(wingShape, extrudeSettings);
        const rightWing = new THREE.Mesh(rightWingGeo, jetMat);
        rightWing.rotation.x = Math.PI / 2;
        rightWing.position.set(0.35, 0.05, 0.7);
        rightWing.castShadow = true;
        jetGroup.add(rightWing);

        const leftWing = rightWing.clone();
        leftWing.scale.x = -1;
        leftWing.position.x = -0.35;
        jetGroup.add(leftWing);

        // IAF Roundels (Saffron, White, Green)
        const createRoundel = () => {
            const rGroup = new THREE.Group();
            const ring1 = new THREE.Mesh(new THREE.CircleGeometry(0.34, 16), new THREE.MeshBasicMaterial({ color: 0xf97316 }));
            const ring2 = new THREE.Mesh(new THREE.CircleGeometry(0.23, 16), new THREE.MeshBasicMaterial({ color: 0xffffff }));
            const ring3 = new THREE.Mesh(new THREE.CircleGeometry(0.12, 16), new THREE.MeshBasicMaterial({ color: 0x16a34a }));
            ring2.position.z = 0.01;
            ring3.position.z = 0.02;
            rGroup.add(ring1); rGroup.add(ring2); rGroup.add(ring3);
            rGroup.rotation.x = -Math.PI / 2;
            return rGroup;
        };

        const rR = createRoundel(); rR.position.set(2.0, 0.14, -0.6); jetGroup.add(rR);
        const rL = createRoundel(); rL.position.set(-2.0, 0.14, -0.6); jetGroup.add(rL);

        // Twin Jet Engine Pods under wing roots
        const engineGeo = new THREE.CylinderGeometry(0.26, 0.24, 2.5, 12);
        const engR = new THREE.Mesh(engineGeo, darkAccentMat);
        engR.rotation.x = Math.PI / 2;
        engR.position.set(0.95, -0.16, -0.2);
        jetGroup.add(engR);

        const engL = engR.clone();
        engL.position.x = -0.95;
        jetGroup.add(engL);

        // Vertical Tailfin & Horizontal Stabilizers
        const tailShape = new THREE.Shape();
        tailShape.moveTo(0, 0);
        tailShape.lineTo(0, 1.5);
        tailShape.lineTo(0.75, 1.4);
        tailShape.lineTo(1.7, 0);
        tailShape.closePath();

        const tailGeo = new THREE.ExtrudeGeometry(tailShape, extrudeSettings);
        const tailfin = new THREE.Mesh(tailGeo, jetMat);
        tailfin.position.set(-0.04, 0.38, -2.5);
        tailfin.castShadow = true;
        jetGroup.add(tailfin);

        const tailplaneGeo = new THREE.BoxGeometry(2.6, 0.07, 0.85);
        const tailplane = new THREE.Mesh(tailplaneGeo, jetMat);
        tailplane.position.set(0, 0.42, -2.3);
        jetGroup.add(tailplane);

        // Slight dynamic upward climb angle
        jetGroup.rotation.x = -0.09;
        monumentGroup.add(jetGroup);

        this.scene.add(monumentGroup);
    }

    buildBuilding1_COE() {
        // Building 1: AISSMS College of Engineering (COE) - Primary Academic Block
        // Houses Central Library, Student Section & Exam Cell, Admission Office
        const coeGroup = new THREE.Group();
        coeGroup.position.set(0.0, 0, -7.5); // Directly behind jet monument

        const wWidth = 15.2;
        const wHeight = 5.2; // 4 floors
        const wDepth = 5.8;

        // White Facade Structure
        const wallMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.45 });
        const mainBlock = new THREE.Mesh(new THREE.BoxGeometry(wWidth, wHeight, wDepth), wallMat);
        mainBlock.position.y = wHeight / 2;
        mainBlock.castShadow = true;
        mainBlock.receiveShadow = true;
        coeGroup.add(mainBlock);

        // Terracotta Red Pilasters / Column Fins (Exact hallmark of COE from photos!)
        const redTrimMat = new THREE.MeshStandardMaterial({ color: 0x991b1b, roughness: 0.4 });
        for (let i = -5; i <= 5; i++) {
            if (i >= -2 && i <= 0) continue; // Leave entrance portal open
            const fin = new THREE.Mesh(new THREE.BoxGeometry(0.38, wHeight, 0.28), redTrimMat);
            fin.position.set(i * 1.32, wHeight / 2, wDepth / 2 + 0.12);
            fin.castShadow = true;
            coeGroup.add(fin);
        }

        // Window Louver Rows across all 4 floors
        const glassMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.1, metalness: 0.85 });
        for (let fl = 1; fl <= 4; fl++) {
            const winRowL = new THREE.Mesh(new THREE.BoxGeometry(5.6, 0.55, 0.05), glassMat);
            winRowL.position.set(-4.0, fl * 1.15 - 0.2, wDepth / 2 + 0.05);
            coeGroup.add(winRowL);

            const winRowR = new THREE.Mesh(new THREE.BoxGeometry(5.6, 0.55, 0.05), glassMat);
            winRowR.position.set(4.0, fl * 1.15 - 0.2, wDepth / 2 + 0.05);
            coeGroup.add(winRowR);
        }

        // The Signature Red Entrance Portal Archway
        const portalMat = new THREE.MeshStandardMaterial({ color: 0xb91c1c, roughness: 0.35 });
        const portalFrame = new THREE.Mesh(new THREE.BoxGeometry(3.0, 3.6, 1.5), portalMat);
        portalFrame.position.set(-1.0, 1.8, wDepth / 2 + 0.75);
        portalFrame.castShadow = true;
        coeGroup.add(portalFrame);

        const doorGlass = new THREE.Mesh(new THREE.BoxGeometry(2.2, 2.6, 0.1), glassMat);
        doorGlass.position.set(-1.0, 1.3, wDepth / 2 + 1.48);
        coeGroup.add(doorGlass);

        // Glowing Rooftop Neon Letters: AISSMS COLLEGE OF ENGINEERING
        const coeSign = this.createRooftopSignCanvas("AISSMS COLLEGE OF ENGINEERING", 0x38bdf8);
        coeSign.position.set(0, wHeight + 1.0, 0);
        coeGroup.add(coeSign);

        // Prominent Landmark Identification Badge: ① AISSMS COE
        const badge1 = this.createLandmarkBadge("① AISSMS COE", "#38bdf8");
        badge1.position.set(0, wHeight + 2.4, 0);
        coeGroup.add(badge1);
        this.landmarkBadges.push(badge1);

        this.scene.add(coeGroup);
    }

    buildBuilding2_MBA() {
        // Building 2: AISSMS Institute of Management (MBA College)
        // Calibrated to Ground-Truth Aerial:
        // Positioned forward on the west wing (X: -14.0, Z: 1.0), facing the central driveway
        // Contains: Xerox Centre ("X") specifically inside the Ground Floor Parking Undercroft!
        const mbaGroup = new THREE.Group();
        mbaGroup.position.set(-14.0, 0, 1.0);

        const bWidth = 7.6;
        const bHeight = 6.2; // 5 floors
        const bDepth = 8.4;

        // 1. Upper Floors 2 to 5 (White Modern Academic Facade)
        const wallMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.45 });
        const upperBlock = new THREE.Mesh(new THREE.BoxGeometry(bWidth, bHeight - 1.5, bDepth), wallMat);
        upperBlock.position.y = (bHeight + 1.5) / 2;
        upperBlock.castShadow = true;
        upperBlock.receiveShadow = true;
        mbaGroup.add(upperBlock);

        // Windows Grid on Upper Facade (Dark punched square windows as seen in real photo)
        const winMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.2, metalness: 0.8 });
        for (let fl = 1; fl <= 4; fl++) {
            const yPos = 1.5 + fl * 1.05;
            // Front windows (facing +X towards courtyard)
            for (let zOffset = -3.0; zOffset <= 3.0; zOffset += 1.5) {
                const wEast = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.55, 0.85), winMat);
                wEast.position.set(bWidth / 2 + 0.03, yPos, zOffset);
                mbaGroup.add(wEast);
            }
            // South face windows (facing +Z towards road)
            for (let xOffset = -2.6; xOffset <= 2.6; xOffset += 1.3) {
                const wSouth = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.55, 0.06), winMat);
                wSouth.position.set(xOffset, yPos, bDepth / 2 + 0.03);
                mbaGroup.add(wSouth);
            }
        }

        // 2. Distinctive Top-Right Mustard/Yellow Cantilever Box Frame (Exact photo feature!)
        const topFrame = new THREE.Mesh(
            new THREE.BoxGeometry(4.8, 1.7, 3.2),
            new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.4 })
        );
        topFrame.position.set(1.4, bHeight + 0.45, bDepth / 2 - 1.2);
        topFrame.castShadow = true;
        mbaGroup.add(topFrame);

        // 3. Grand Entrance Stairway leading to 1st floor on the courtyard face
        const stairMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.6 });
        const stair = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.9, 3.8), stairMat);
        stair.position.set(bWidth / 2 + 1.2, 0.45, 0.5);
        mbaGroup.add(stair);

        // 4. GROUND LEVEL OPEN PARKING UNDERCROFT / ARCADE
        // 8 Sturdy Concrete Columns supporting the building above
        const colMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.6 });
        const colOffsets = [
            [-3.2, -3.5], [0, -3.5], [3.2, -3.5],
            [-3.2, 0], [3.2, 0],
            [-3.2, 3.5], [0, 3.5], [3.2, 3.5]
        ];
        colOffsets.forEach(([cx, cz]) => {
            const col = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 1.5, 12), colMat);
            col.position.set(cx, 0.75, cz);
            col.castShadow = true;
            mbaGroup.add(col);
        });

        // Undercroft Ceiling Slab
        const ceilingSlab = new THREE.Mesh(new THREE.BoxGeometry(bWidth, 0.15, bDepth), colMat);
        ceilingSlab.position.y = 1.45;
        mbaGroup.add(ceilingSlab);

        // =========================================================================
        // 5. THE XEROX CENTRE [X] - LOCATED AT GROUND PARKING UNDER THIS BUILDING!
        // Exactly at front-left undercroft corner marked with "X" in user photo!
        // =========================================================================
        const xeroxHub = new THREE.Group();
        xeroxHub.position.set(-1.8, 0, 2.4);

        // Glass Front & Service Counter
        const counterMat = new THREE.MeshStandardMaterial({ color: 0x047857, roughness: 0.3 });
        const counter = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.9, 0.6), counterMat);
        counter.position.set(0, 0.45, 0.8);
        counter.castShadow = true;
        xeroxHub.add(counter);

        // Desktop Monitor & Scanner Terminal
        const compScreen = new THREE.Mesh(
            new THREE.BoxGeometry(0.45, 0.35, 0.05),
            new THREE.MeshStandardMaterial({ color: 0x38bdf8, emissive: 0x0284c7, emissiveIntensity: 0.6 })
        );
        compScreen.position.set(-0.6, 1.1, 0.8);
        xeroxHub.add(compScreen);

        // Heavy-duty Photocopy Machines (2 high-speed Xerox consoles)
        const copierMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.5 });
        const darkTrayMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.3 });

        for (let m = 0; m < 2; m++) {
            const machine = new THREE.Group();
            machine.position.set(0.3 + m * 0.9, 0, -0.4);

            // Copier Main Body
            const body = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.85, 0.65), copierMat);
            body.position.y = 0.45;
            body.castShadow = true;
            machine.add(body);

            // Open Scanner Platen Lid
            const lid = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.06, 0.62), darkTrayMat);
            lid.position.set(0, 0.92, -0.05);
            lid.rotation.x = -0.25; // Angled open
            machine.add(lid);

            // Side Paper Output Tray
            const tray = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.04, 0.4), darkTrayMat);
            tray.position.set(0.42, 0.6, 0);
            machine.add(tray);

            xeroxHub.add(machine);
        }

        // Green Glow inside the Xerox shop
        const shopLight = new THREE.PointLight(0x10b981, 2.5, 6);
        shopLight.position.set(0, 1.2, 0);
        xeroxHub.add(shopLight);

        // Illuminated Signboard on Undercroft Beam: "XEROX & REPROGRAPHIC [X]"
        const xeroxWallSign = this.createPillBadge("🖨️ XEROX CENTER [X]", "#10b981");
        xeroxWallSign.position.set(0, 1.6, 1.6);
        xeroxHub.add(xeroxWallSign);

        mbaGroup.add(xeroxHub);

        // 6. Parked Staff Cars & Scooters inside the rest of the undercroft
        const scooterMat = new THREE.MeshStandardMaterial({ color: 0x0284c7 });
        for (let sc = 0; sc < 3; sc++) {
            const scooter = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.5, 0.9), scooterMat);
            scooter.position.set(2.0, 0.25, -2.0 + sc * 0.9);
            scooter.castShadow = true;
            mbaGroup.add(scooter);
        }

        // Rooftop Signboard
        const mbaSign = this.createRooftopSignCanvas("AISSMS INSTITUTE OF MANAGEMENT", "#fbbf24");
        mbaSign.position.set(0, bHeight + 1.6, 0);
        mbaGroup.add(mbaSign);

        // Landmark Badge: ② AISSMS MBA College
        const badge2 = this.createLandmarkBadge("② AISSMS MBA (IOM)", "#fbbf24");
        badge2.position.set(0, bHeight + 3.0, 0);
        mbaGroup.add(badge2);
        this.landmarkBadges.push(badge2);

        this.scene.add(mbaGroup);
    }

    buildBuilding3_Pharmacy() {
        // Building 3: AISSMS College of Pharmacy
        // Features: Stepped Gabled Roof, Signature Peach Cylindrical Oriel Window, Parking Ramp
        const pharmGroup = new THREE.Group();
        pharmGroup.position.set(8.5, 0, 7.5);

        const pWidth = 6.2;
        const pHeight = 4.6;
        const pDepth = 5.0;

        // White Facade Structure
        const wallMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.5 });
        const mainBlock = new THREE.Mesh(new THREE.BoxGeometry(pWidth, pHeight, pDepth), wallMat);
        mainBlock.position.y = pHeight / 2;
        mainBlock.castShadow = true;
        pharmGroup.add(mainBlock);

        // Signature Peach Cylindrical Oriel Bay Window (Exact feature from photo!)
        const orielGeo = new THREE.CylinderGeometry(1.3, 1.3, 2.2, 16, 1, false, 0, Math.PI);
        const orielMat = new THREE.MeshStandardMaterial({ color: 0xfdba74, roughness: 0.4 });
        const oriel = new THREE.Mesh(orielGeo, orielMat);
        oriel.position.set(0, 2.6, pDepth / 2 + 0.1);
        oriel.rotation.y = Math.PI / 2;
        pharmGroup.add(oriel);

        // Stepped Gabled Roof Profile
        const roofGeo = new THREE.ConeGeometry(3.6, 1.2, 4);
        const roofMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.6 });
        const roof = new THREE.Mesh(roofGeo, roofMat);
        roof.position.set(0, pHeight + 0.6, 0);
        roof.rotation.y = Math.PI / 4;
        pharmGroup.add(roof);

        // Basement Parking Ramp on the side
        const ramp = new THREE.Mesh(
            new THREE.BoxGeometry(1.4, 0.4, 3.2),
            new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.9 })
        );
        ramp.position.set(-pWidth / 2 - 0.7, 0.2, 0);
        ramp.rotation.x = 0.15;
        pharmGroup.add(ramp);

        // Rooftop Sign
        const pharmSign = this.createRooftopSignCanvas("AISSMS COLLEGE OF PHARMACY", "#f472b6");
        pharmSign.position.set(0, pHeight + 1.6, 0);
        pharmGroup.add(pharmSign);

        // Landmark Badge: ③ College of Pharmacy
        const badge3 = this.createLandmarkBadge("③ College of Pharmacy", "#f472b6");
        badge3.position.set(0, pHeight + 3.0, 0);
        pharmGroup.add(badge3);
        this.landmarkBadges.push(badge3);

        this.scene.add(pharmGroup);
    }

    buildBuilding4_IOIT() {
        // Building 4: AISSMS Institute of Information Technology (IOIT)
        // Features: 8-Story Tall Computing Tower + Curved Orange Auditorium Pavilion
        const ioitGroup = new THREE.Group();
        ioitGroup.position.set(16.5, 0, -3.5);

        // 8-Story High-Rise Computing Tower
        const tWidth = 6.8;
        const tHeight = 8.8; // 8 floors
        const tDepth = 5.4;

        const towerMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.45 });
        const tower = new THREE.Mesh(new THREE.BoxGeometry(tWidth, tHeight, tDepth), towerMat);
        tower.position.y = tHeight / 2;
        tower.castShadow = true;
        ioitGroup.add(tower);

        // Window Grid across 8 floors with vertical louvers
        const ioitWinMat = new THREE.MeshStandardMaterial({ color: 0x1e3a8a, metalness: 0.85 });
        for (let fl = 1; fl <= 8; fl++) {
            const w = new THREE.Mesh(new THREE.BoxGeometry(5.8, 0.48, 0.05), ioitWinMat);
            w.position.set(0, fl * 1.05 - 0.3, tDepth / 2 + 0.05);
            ioitGroup.add(w);
        }

        // Curved Orange Auditorium Pavilion in Front (Exact feature from photo!)
        const audGeo = new THREE.CylinderGeometry(3.6, 3.6, 3.2, 24, 1, false, -Math.PI / 2.2, Math.PI);
        const audMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.45 });
        const aud = new THREE.Mesh(audGeo, audMat);
        aud.position.set(-1.4, 1.6, tDepth / 2 + 1.2);
        ioitGroup.add(aud);

        // Terrace Pergolas over the Curved Pavilion
        const timberMat = new THREE.MeshStandardMaterial({ color: 0x78350f });
        for (let b = -2; b <= 2; b++) {
            const beam = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.16, 2.8), timberMat);
            beam.position.set(b * 0.9 - 1.4, 3.3, tDepth / 2 + 1.2);
            ioitGroup.add(beam);
        }

        // Rooftop Signboard
        const ioitSign = this.createRooftopSignCanvas("AISSMS IOIT", "#38bdf8");
        ioitSign.position.set(0, tHeight + 1.0, 0);
        ioitGroup.add(ioitSign);

        // Landmark Badge: ④ AISSMS IOIT
        const badge4 = this.createLandmarkBadge("④ AISSMS IOIT", "#38bdf8");
        badge4.position.set(0, tHeight + 2.5, 0);
        ioitGroup.add(badge4);
        this.landmarkBadges.push(badge4);

        this.scene.add(ioitGroup);
    }

    buildShivajiStatueMemorial() {
        const statueGroup = new THREE.Group();
        statueGroup.position.set(12.5, 0, 3.5); // Right forecourt plaza in front of IOIT curved auditorium

        // Circular stone plaza plinth
        const basePlinth = new THREE.Mesh(
            new THREE.CylinderGeometry(3.6, 3.8, 0.3, 24),
            new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.8 })
        );
        basePlinth.position.y = 0.15;
        basePlinth.receiveShadow = true;
        statueGroup.add(basePlinth);

        // Curved Acoustic Memorial Stone Wall Backdrop (matches photo!)
        const wallGeo = new THREE.CylinderGeometry(3.2, 3.2, 2.2, 24, 1, true, -Math.PI / 3, (2 * Math.PI) / 3);
        const wallMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.9, side: THREE.DoubleSide });
        const wall = new THREE.Mesh(wallGeo, wallMat);
        wall.position.y = 1.25;
        statueGroup.add(wall);

        // Black Granite Pedestal Plinth
        const plinth = new THREE.Mesh(
            new THREE.BoxGeometry(1.4, 1.8, 1.4),
            new THREE.MeshStandardMaterial({ color: 0x09090b, roughness: 0.2, metalness: 0.85 })
        );
        plinth.position.y = 1.05;
        plinth.castShadow = true;
        statueGroup.add(plinth);

        // Bronze Statue Figure of Chhatrapati Shivaji Maharaj
        const bronzeMat = new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.3, metalness: 0.85 });
        const figure = new THREE.Group();
        figure.position.y = 2.0;

        const body = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.35, 1.2, 8), bronzeMat);
        body.position.y = 0.6;
        body.castShadow = true;
        figure.add(body);

        const head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 12), bronzeMat);
        head.position.y = 1.35;
        figure.add(head);

        const pagdi = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.22, 0.2, 12), new THREE.MeshStandardMaterial({ color: 0xf97316 }));
        pagdi.position.y = 1.5;
        figure.add(pagdi);

        const sword = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.6, 6), new THREE.MeshStandardMaterial({ color: 0xd4d4d8, metalness: 0.9 }));
        sword.position.set(0.35, 0.8, 0.1);
        figure.add(sword);

        statueGroup.add(figure);

        // Surrounding Marigold Flowerbed Ring
        const flowerRing = new THREE.Mesh(
            new THREE.RingGeometry(2.4, 3.2, 24),
            new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.9, side: THREE.DoubleSide })
        );
        flowerRing.rotation.x = -Math.PI / 2;
        flowerRing.position.y = 0.31;
        statueGroup.add(flowerRing);

        this.scene.add(statueGroup);
    }

    buildCentralCanteenAndMess() {
        // =========================================================================
        // AISSMS Central Canteen: Relocated to EXTREME BOTTOM LEFT (opposite MBA)
        // Leaving the center quadrangle lawn 100% open and pristine as in drone photo!
        // =========================================================================
        const canteenGroup = new THREE.Group();
        canteenGroup.position.set(-17.5, 0, 12.0);

        // Elevated Dining Deck Platform
        const deckMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.7 });
        const deck = new THREE.Mesh(new THREE.BoxGeometry(7.6, 0.2, 6.8), deckMat);
        deck.position.y = 0.1;
        deck.receiveShadow = true;
        canteenGroup.add(deck);

        // Canteen Main Kitchen & Billing Pavilion Block
        const cBlock = new THREE.Mesh(
            new THREE.BoxGeometry(6.2, 2.6, 2.8),
            new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.45 })
        );
        cBlock.position.set(0, 1.3, -1.8);
        cBlock.castShadow = true;
        canteenGroup.add(cBlock);

        // Food Court Glass Service Counters & Shutter Windows
        const counterMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.4 });
        const foodCounter = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.9, 0.5), counterMat);
        foodCounter.position.set(0, 0.55, -0.4);
        foodCounter.castShadow = true;
        canteenGroup.add(foodCounter);

        // Menu Display Backlit Board
        const menuBoard = new THREE.Mesh(
            new THREE.BoxGeometry(3.6, 0.6, 0.05),
            new THREE.MeshStandardMaterial({ color: 0x0284c7, emissive: 0x0369a1, emissiveIntensity: 0.7 })
        );
        menuBoard.position.set(0, 2.0, -0.38);
        canteenGroup.add(menuBoard);

        // Orange Food Court Trim
        const cTrim = new THREE.Mesh(new THREE.BoxGeometry(6.4, 0.25, 3.0), new THREE.MeshStandardMaterial({ color: 0xf97316 }));
        cTrim.position.set(0, 2.65, -1.8);
        canteenGroup.add(cTrim);

        // Outdoor Pergolas with Dining Tables & Canvas Umbrellas
        const timberMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.8 });
        for (let i = -2; i <= 2; i++) {
            const beam = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.18, 3.4), timberMat);
            beam.position.set(i * 1.1, 2.4, 1.2);
            canteenGroup.add(beam);
        }

        // 4 Outdoor Round Dining Tables with Seating & Sun Umbrellas
        const tableMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0 });
        const benchMat = new THREE.MeshStandardMaterial({ color: 0x64748b });
        const umbrellaColors = [0xf97316, 0x0284c7, 0x10b981, 0xfacc15];

        const tPositions = [
            [-1.8, 0.45, 0.2], [1.8, 0.45, 0.2],
            [-1.8, 0.45, 2.4], [1.8, 0.45, 2.4]
        ];

        tPositions.forEach(([tx, ty, tz], idx) => {
            // Round table
            const table = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.45, 12), tableMat);
            table.position.set(tx, ty, tz);
            table.castShadow = true;
            canteenGroup.add(table);

            // Circular bench ring
            const bench = new THREE.Mesh(new THREE.RingGeometry(0.75, 0.95, 12), benchMat);
            bench.rotation.x = -Math.PI / 2;
            bench.position.set(tx, 0.28, tz);
            canteenGroup.add(bench);

            // Sun Umbrella Pole & Canopy
            const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.8, 8), timberMat);
            pole.position.set(tx, 1.1, tz);
            canteenGroup.add(pole);

            const canopy = new THREE.Mesh(
                new THREE.ConeGeometry(0.95, 0.4, 8),
                new THREE.MeshStandardMaterial({ color: umbrellaColors[idx % 4], roughness: 0.6 })
            );
            canopy.position.set(tx, 1.9, tz);
            canopy.castShadow = true;
            canteenGroup.add(canopy);
        });

        // Rooftop Signboard: AISSMS CENTRAL CANTEEN
        const canteenSign = this.createRooftopSignCanvas("AISSMS CENTRAL CANTEEN", "#f97316");
        canteenSign.position.set(0, 3.5, -1.8);
        canteenGroup.add(canteenSign);
        this.scene.add(canteenGroup);

        // Hostel Dining & Mess Pavilion (Residential Block at far west perimeter)
        const messGroup = new THREE.Group();
        messGroup.position.set(-21.0, 0, -5.0);

        const messBlock = new THREE.Mesh(
            new THREE.BoxGeometry(4.8, 2.8, 4.4),
            new THREE.MeshStandardMaterial({ color: 0x9333ea, roughness: 0.5 })
        );
        messBlock.position.y = 1.4;
        messBlock.castShadow = true;
        messGroup.add(messBlock);

        const messSign = this.createRooftopSignCanvas("HOSTEL MESS", "#c084fc");
        messSign.position.set(0, 3.5, 0);
        messGroup.add(messSign);
        this.scene.add(messGroup);
    }

    buildWorkshopShedsAndGround() {
        // Industrial Training Institute (ITI) & Mechanical Workshops - Sawtooth Gable Roofs (matches satellite view!)
        const shedGroup = new THREE.Group();
        shedGroup.position.set(-18.5, 0, -6.5);

        for (let s = 0; s < 4; s++) {
            const shed = new THREE.Mesh(
                new THREE.BoxGeometry(5.2, 2.0, 2.2),
                new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.8 })
            );
            shed.position.set(0, 1.0, s * 2.5);
            shedGroup.add(shed);

            // Sawtooth gable roof prism
            const roof = new THREE.Mesh(
                new THREE.ConeGeometry(1.8, 0.9, 4),
                new THREE.MeshStandardMaterial({ color: 0xb45309 })
            );
            roof.position.set(0, 2.4, s * 2.5);
            roof.rotation.y = Math.PI / 4;
            shedGroup.add(roof);
        }
        this.scene.add(shedGroup);
    }

    buildFacilityBillboards() {
        // Create interactive SmartQueue holographic status indicators for each monitored facility
        this.facilities.forEach(cfg => {
            const fGroup = new THREE.Group();
            fGroup.userData = { id: cfg.id, name: cfg.name, fullTitle: cfg.fullTitle, targetY: 0, currentY: 0 };

            // Ground Status Ring
            const ringGeo = new THREE.RingGeometry(1.8, 2.3, 32);
            const ringMat = new THREE.MeshBasicMaterial({
                color: 0x10b981,
                side: THREE.DoubleSide,
                transparent: true,
                opacity: 0.85
            });
            const ring = new THREE.Mesh(ringGeo, ringMat);
            ring.rotation.x = -Math.PI / 2;
            ring.position.y = 0.08;
            fGroup.add(ring);
            fGroup.userData.ringMat = ringMat;

            // Floating Billboard
            const billboard = this.createBillboard(cfg.name, "🟢 Fast · 0m");
            billboard.position.y = (cfg.bldgNum === 1) ? 6.8 : (cfg.bldgNum === 2 ? 5.8 : 4.8);
            fGroup.add(billboard);
            fGroup.userData.billboard = billboard;

            fGroup.position.set(cfg.x, 0, cfg.z);
            this.scene.add(fGroup);
            this.buildings.push(fGroup);
        });
    }

    createBillboard(name, statusText) {
        const canvas = document.createElement("canvas");
        canvas.width = 256;
        canvas.height = 128;
        const ctx = canvas.getContext("2d");

        ctx.fillStyle = "rgba(15, 23, 42, 0.92)";
        ctx.strokeStyle = "#f97316";
        ctx.lineWidth = 4;
        this.roundRect(ctx, 4, 4, 248, 120, 18, true, true);

        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 21px Arial";
        ctx.textAlign = "center";
        ctx.fillText(name, 128, 46);

        ctx.fillStyle = "#38bdf8";
        ctx.font = "bold 20px Arial";
        ctx.fillText(statusText, 128, 88);

        const texture = new THREE.CanvasTexture(canvas);
        const mat = new THREE.SpriteMaterial({ map: texture, transparent: true });
        const sprite = new THREE.Sprite(mat);
        sprite.scale.set(3.8, 1.9, 1);
        sprite.userData = { canvas, ctx, texture };
        return sprite;
    }

    createRooftopSignCanvas(text, accentColorHex = "#38bdf8") {
        const canvas = document.createElement("canvas");
        canvas.width = 512;
        canvas.height = 96;
        const ctx = canvas.getContext("2d");

        ctx.fillStyle = "rgba(15, 23, 42, 0.85)";
        ctx.strokeStyle = accentColorHex;
        ctx.lineWidth = 4;
        this.roundRect(ctx, 4, 4, 504, 88, 16, true, true);

        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 26px Arial";
        ctx.textAlign = "center";
        ctx.fillText(text, 256, 56);

        const texture = new THREE.CanvasTexture(canvas);
        const mat = new THREE.SpriteMaterial({ map: texture, transparent: true });
        const sprite = new THREE.Sprite(mat);
        sprite.scale.set(5.8, 1.2, 1);
        return sprite;
    }

    createLandmarkBadge(text, colorHex = "#38bdf8") {
        const canvas = document.createElement("canvas");
        canvas.width = 320;
        canvas.height = 72;
        const ctx = canvas.getContext("2d");

        ctx.fillStyle = colorHex;
        this.roundRect(ctx, 4, 4, 312, 64, 14, true, false);

        ctx.fillStyle = "#070a13";
        ctx.font = "900 24px Arial";
        ctx.textAlign = "center";
        ctx.fillText(text, 160, 44);

        const texture = new THREE.CanvasTexture(canvas);
        const mat = new THREE.SpriteMaterial({ map: texture, transparent: true });
        const sprite = new THREE.Sprite(mat);
        sprite.scale.set(4.2, 0.95, 1);
        return sprite;
    }

    createPillBadge(text, colorHex = "#10b981") {
        const canvas = document.createElement("canvas");
        canvas.width = 280;
        canvas.height = 64;
        const ctx = canvas.getContext("2d");

        ctx.fillStyle = "rgba(15, 23, 42, 0.95)";
        ctx.strokeStyle = colorHex;
        ctx.lineWidth = 3;
        this.roundRect(ctx, 3, 3, 274, 58, 12, true, true);

        ctx.fillStyle = colorHex;
        ctx.font = "bold 18px Arial";
        ctx.textAlign = "center";
        ctx.fillText(text, 140, 38);

        const texture = new THREE.CanvasTexture(canvas);
        const mat = new THREE.SpriteMaterial({ map: texture, transparent: true });
        const sprite = new THREE.Sprite(mat);
        sprite.scale.set(3.4, 0.8, 1);
        return sprite;
    }

    roundRect(ctx, x, y, width, height, radius, fill, stroke) {
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + width - radius, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
        ctx.lineTo(x + width, y + height - radius);
        ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        ctx.lineTo(x + radius, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();
        if (fill) ctx.fill();
        if (stroke) ctx.stroke();
    }

    buildDynamicEffects() {
        // 1. Moving student particles along paths
        const pCount = 280;
        const geo = new THREE.BufferGeometry();
        const positions = new Float32Array(pCount * 3);

        for (let i = 0; i < pCount * 3; i += 3) {
            positions[i] = (Math.random() - 0.5) * 36;
            positions[i + 1] = 0.2 + Math.random() * 0.3;
            positions[i + 2] = (Math.random() - 0.5) * 24;
        }

        geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
        const mat = new THREE.PointsMaterial({
            color: 0x38bdf8,
            size: 0.24,
            transparent: true,
            opacity: 0.8
        });

        this.particles = new THREE.Points(geo, mat);
        this.scene.add(this.particles);

        // 2. Working lawn sprinklers in the central lawn (as seen in photo 1!)
        const sprinklerSpots = [
            [-4, 0.1, 3], [4, 0.1, 3],
            [-4, 0.1, 6], [4, 0.1, 6]
        ];

        sprinklerSpots.forEach(([sx, sy, sz]) => {
            const spHead = new THREE.Mesh(
                new THREE.CylinderGeometry(0.06, 0.08, 0.25, 8),
                new THREE.MeshStandardMaterial({ color: 0x94a3b8 })
            );
            spHead.position.set(sx, sy, sz);
            this.scene.add(spHead);

            const mistGeo = new THREE.ConeGeometry(1.6, 0.6, 12, 1, true);
            const mistMat = new THREE.MeshBasicMaterial({
                color: 0xbae6fd,
                wireframe: true,
                transparent: true,
                opacity: 0.35
            });
            const mist = new THREE.Mesh(mistGeo, mistMat);
            mist.position.set(sx, sy + 0.35, sz);
            this.scene.add(mist);
            this.sprinklers.push(mist);
        });
    }

    updateCrowdColors(facilities) {
        if (!facilities) return;
        facilities.forEach(f => {
            const bGroup = this.buildings.find(b => b.userData.id === f.place_id);
            if (bGroup && bGroup.userData.ringMat) {
                let colorHex = 0x10b981;
                let statusStr = `🟢 ${f.occupancy_percentage}% · No wait`;

                if (f.level === "Medium") {
                    colorHex = 0xf59e0b;
                    statusStr = `🟡 ${f.occupancy_percentage}% · ~${f.queue_metrics.wait_time_minutes}m`;
                }
                if (f.level === "High" || f.is_spike) {
                    colorHex = 0xef4444;
                    statusStr = `🔴 ${f.occupancy_percentage}% · Rush!`;
                }

                bGroup.userData.ringMat.color.setHex(colorHex);

                const sprite = bGroup.userData.billboard;
                if (sprite && sprite.userData.ctx) {
                    const ctx = sprite.userData.ctx;
                    ctx.clearRect(0, 0, 256, 128);
                    ctx.fillStyle = "rgba(15, 23, 42, 0.92)";
                    ctx.strokeStyle = `#${colorHex.toString(16).padStart(6, '0')}`;
                    ctx.lineWidth = 4;
                    this.roundRect(ctx, 4, 4, 248, 120, 18, true, true);

                    ctx.fillStyle = "#ffffff";
                    ctx.font = "bold 21px Arial";
                    ctx.textAlign = "center";
                    ctx.fillText(bGroup.userData.name, 128, 46);

                    ctx.fillStyle = `#${colorHex.toString(16).padStart(6, '0')}`;
                    ctx.font = "bold 20px Arial";
                    ctx.fillText(statusStr, 128, 88);

                    sprite.userData.texture.needsUpdate = true;
                }
            }
        });
    }

    focusOnPlace(placeId) {
        if (this.isTourRunning) this.stopEvaluatorTour();
        if (!this.controls) return;

        const pId = parseInt(placeId);
        let camPos = new THREE.Vector3(0, 10, 8);
        let targetPos = new THREE.Vector3(0, 2, -6);
        let label = "Building 1: AISSMS COE";

        if (pId === 1) {
            camPos = new THREE.Vector3(-2, 7, -2);
            targetPos = new THREE.Vector3(-2.2, 2, -7.5);
            label = "① COE Admission Office (Building 1 - Ground Floor)";
        } else if (pId === 2) {
            camPos = new THREE.Vector3(4, 7, -2);
            targetPos = new THREE.Vector3(3.8, 2, -7.5);
            label = "① COE Student Section & Exam (Building 1 - Windows 1-4)";
        } else if (pId === 3) {
            // Central Canteen at extreme bottom left (opposite side of MBA)
            camPos = new THREE.Vector3(-14.5, 6, 17);
            targetPos = new THREE.Vector3(-17.5, 1.8, 12.0);
            label = "AISSMS Central Canteen (Extreme Bottom-Left Dining Court)";
        } else if (pId === 4) {
            // Xerox Centre at MBA Building 2 Ground Parking Level
            camPos = new THREE.Vector3(-11.5, 4.8, 7.5);
            targetPos = new THREE.Vector3(-14.5, 1.2, 3.2);
            label = "② Campus Xerox Centre [X] (Building 2 - Ground Parking Level)";
        } else if (pId === 5) {
            camPos = new THREE.Vector3(-18, 7, 0);
            targetPos = new THREE.Vector3(-21, 2, -5);
            label = "Hostel Dining & Mess Hall";
        } else if (pId === 6) {
            camPos = new THREE.Vector3(0.8, 9, -2);
            targetPos = new THREE.Vector3(0.8, 4.5, -7.5);
            label = "① COE Central Library (Building 1 - 2nd/3rd Floor)";
        }

        this.animateCameraTo(camPos, targetPos, 1200);

        this.buildings.forEach(b => {
            if (b.userData.id === pId || (pId === 6 && b.userData.id === 1)) {
                b.userData.targetY = 0.8;
                setTimeout(() => { b.userData.targetY = 0; }, 3000);
            }
        });

        if (typeof showToast === "function") {
            showToast(`📍 3D Camera focused: ${label}`);
        }
    }

    animateCameraTo(targetPos, lookAtPos, durationMs = 1200) {
        if (!this.controls) return;
        const startPos = this.camera.position.clone();
        const startTarget = this.controls.target.clone();
        const startTime = performance.now();

        const step = () => {
            const now = performance.now();
            const elapsed = (now - startTime) / durationMs;
            const t = Math.min(1.0, elapsed);
            // Ease-in-out cubic
            const ease = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

            this.camera.position.lerpVectors(startPos, targetPos, ease);
            this.controls.target.lerpVectors(startTarget, lookAtPos, ease);
            this.controls.update();

            if (t < 1.0) {
                requestAnimationFrame(step);
            }
        };
        requestAnimationFrame(step);
    }

    // 🎬 1-Click Guided Tour for Faculty / Evaluators
    toggleEvaluatorTour() {
        if (this.isTourRunning) {
            this.stopEvaluatorTour();
        } else {
            this.startEvaluatorTour();
        }
    }

    startEvaluatorTour() {
        this.isTourRunning = true;
        this.tourStep = 0;
        const tourBtn = document.getElementById("btn3dTour");
        if (tourBtn) {
            tourBtn.innerText = "⏹ Stop Tour";
            tourBtn.style.color = "#f97316";
        }
        if (typeof showToast === "function") {
            showToast("🎬 Starting Guided AISSMS Campus Tour...");
        }
        this.runNextTourWaypoint();
    }

    stopEvaluatorTour() {
        this.isTourRunning = false;
        if (this.tourTimer) clearTimeout(this.tourTimer);
        const tourBtn = document.getElementById("btn3dTour");
        if (tourBtn) {
            tourBtn.innerText = "🎬 Evaluator Tour";
            tourBtn.style.color = "#e2e8f0";
        }
        this.resetCamera();
        if (typeof showToast === "function") {
            showToast("Tour ended - Returned to Default View");
        }
    }

    runNextTourWaypoint() {
        if (!this.isTourRunning) return;

        const waypoints = [
            {
                cam: new THREE.Vector3(0, 10, 8),
                target: new THREE.Vector3(0, 2, -6),
                title: "① AISSMS COE (Main Academic Wing & IAF Jet Memorial)",
                desc: "Houses Central Library, Student Section & Admission Office"
            },
            {
                cam: new THREE.Vector3(-11.5, 5.5, 7.5),
                target: new THREE.Vector3(-14.0, 1.2, 2.5),
                title: "② AISSMS MBA College & Ground Parking Xerox Hub [X]",
                desc: "Xerox & Reprographic Hub located specifically in ground parking undercroft"
            },
            {
                cam: new THREE.Vector3(-14.5, 6, 17),
                target: new THREE.Vector3(-17.5, 1.8, 12.0),
                title: "AISSMS Central Canteen (Extreme Bottom-Left Dining Court)",
                desc: "High footfall dining court relocated to campus corner with outdoor tables"
            },
            {
                cam: new THREE.Vector3(7.5, 6.5, 8.5),
                target: new THREE.Vector3(8.0, 2.2, 2.5),
                title: "③ AISSMS College of Pharmacy",
                desc: "Distinctive peach cylindrical oriel bay window & parking ramp"
            },
            {
                cam: new THREE.Vector3(13.5, 7.5, 8.5),
                target: new THREE.Vector3(12.5, 2.5, 3.5),
                title: "④ AISSMS IOIT & Chhatrapati Shivaji Maharaj Statue Plaza",
                desc: "8-Story Computing Tower & Heroic Bronze Statue Memorial"
            }
        ];

        const wp = waypoints[this.tourStep];
        if (typeof showToast === "function") {
            showToast(`📍 ${wp.title}`);
        }
        this.animateCameraTo(wp.cam, wp.target, 1600);

        this.tourStep = (this.tourStep + 1) % waypoints.length;
        this.tourTimer = setTimeout(() => {
            if (this.isTourRunning) this.runNextTourWaypoint();
        }, 5000);
    }

    onMouseMove(event) {
        const rect = this.container.getBoundingClientRect();
        this.mouse.x = ((event.clientX - rect.left) / this.container.clientWidth) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / this.container.clientHeight) * 2 + 1;

        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersects = this.raycaster.intersectObjects(this.buildings, true);

        if (intersects.length > 0) {
            let hitGroup = intersects[0].object.parent;
            while (hitGroup && !hitGroup.userData.id && hitGroup.parent) {
                hitGroup = hitGroup.parent;
            }

            if (hitGroup && hitGroup.userData.id) {
                if (this.hoveredBuilding !== hitGroup) {
                    if (this.hoveredBuilding) this.hoveredBuilding.userData.targetY = 0;
                    this.hoveredBuilding = hitGroup;
                    this.hoveredBuilding.userData.targetY = 0.6;
                    this.container.style.cursor = "pointer";
                }
                return;
            }
        }

        if (this.hoveredBuilding) {
            this.hoveredBuilding.userData.targetY = 0;
            this.hoveredBuilding = null;
            this.container.style.cursor = "default";
        }
    }

    onClick() {
        if (this.hoveredBuilding && this.hoveredBuilding.userData.id) {
            const placeId = this.hoveredBuilding.userData.id;
            const targetCard = document.getElementById(`facility-card-${placeId}`);
            if (targetCard) {
                targetCard.scrollIntoView({ behavior: "smooth", block: "center" });
                targetCard.classList.add("highlight-pulse");
                setTimeout(() => targetCard.classList.remove("highlight-pulse"), 2000);
            }
        }
    }

    resetCamera() {
        if (this.isTourRunning) this.stopEvaluatorTour();
        if (!this.controls) return;
        this.animateCameraTo(new THREE.Vector3(0, 25, 34), new THREE.Vector3(0, 2, 0), 1000);
    }

    focusOnPlace(placeId) {
        if (this.isTourRunning) this.stopEvaluatorTour();
        if (!this.controls) return;

        const pId = parseInt(placeId);
        let camPos = new THREE.Vector3(0, 9, 8);
        let targetPos = new THREE.Vector3(0, 2.5, -4);
        let label = "Building 1: AISSMS COE";

        if (pId === 1) {
            // COE Admission Office (Bldg 1 Ground Floor)
            camPos = new THREE.Vector3(0, 8, 7.5);
            targetPos = new THREE.Vector3(0, 2.2, -4);
            label = "① COE Admission Office (Building 1 - Ground Floor)";
        } else if (pId === 2) {
            // COE Student Section & Exam Cell (Bldg 1)
            camPos = new THREE.Vector3(3.5, 7.5, 7);
            targetPos = new THREE.Vector3(2, 2.2, -4);
            label = "① COE Student Section & Exam (Building 1 - Windows 1-4)";
        } else if (pId === 3) {
            // Central Canteen
            camPos = new THREE.Vector3(-4, 6.5, 12);
            targetPos = new THREE.Vector3(-4, 1.5, 5);
            label = "AISSMS Central Canteen & Quadrangle Pergolas";
        } else if (pId === 4) {
            // Xerox Centre at MBA Building 2 Parking
            camPos = new THREE.Vector3(-12.5, 6, 4.5);
            targetPos = new THREE.Vector3(-12.5, 1.8, -4);
            label = "② Campus Xerox Centre [X] (Building 2 - MBA Parking Level)";
        } else if (pId === 5) {
            // Hostel Dining & Mess
            camPos = new THREE.Vector3(-8, 8, 14);
            targetPos = new THREE.Vector3(-6, 2, 8);
            label = "Hostel Dining & Mess Hall";
        } else if (pId === 6) {
            // COE Central Library (Bldg 1 Upper Floors)
            camPos = new THREE.Vector3(0, 11, 8);
            targetPos = new THREE.Vector3(0, 4.5, -4);
            label = "① COE Central Library (Building 1 - 2nd/3rd Floor)";
        }

        this.animateCameraTo(camPos, targetPos, 1200);

        // Highlight matching building if available
        this.buildings.forEach(b => {
            if (b.userData.id === pId || (pId === 6 && b.userData.id === 1)) {
                b.userData.targetY = 0.8;
                setTimeout(() => { b.userData.targetY = 0; }, 3000);
            }
        });

        if (typeof showToast === "function") {
            showToast(`📍 3D Camera focused: ${label}`);
        }
    }

    setAerialView() {
        if (this.isTourRunning) this.stopEvaluatorTour();
        if (!this.controls) return;
        // Directly overhead mimicking Google Maps Satellite viewpoint
        this.animateCameraTo(new THREE.Vector3(0, 46, 0.1), new THREE.Vector3(0, 0, 0), 1000);
    }

    toggleDayNight() {
        this.isNightMode = !this.isNightMode;
        if (this.isNightMode) {
            this.scene.background.setHex(0x070a13);
            this.scene.fog.color.setHex(0x070a13);
            this.sunLight.intensity = 1.0;
            this.ambientLight.intensity = 0.55;
            this.skyFillLight.intensity = 0.3;
            if (this.jetSpot) this.jetSpot.intensity = 2.5;
            if (this.statueSpot) this.statueSpot.intensity = 2.4;
            if (this.xeroxSpot) this.xeroxSpot.intensity = 2.8;
        } else {
            // Bright Day Mode (Pune afternoon sunlight)
            this.scene.background.setHex(0x1e293b);
            this.scene.fog.color.setHex(0x1e293b);
            this.sunLight.intensity = 2.2;
            this.ambientLight.intensity = 1.25;
            this.skyFillLight.intensity = 0.8;
            if (this.jetSpot) this.jetSpot.intensity = 0.8;
            if (this.statueSpot) this.statueSpot.intensity = 0.8;
            if (this.xeroxSpot) this.xeroxSpot.intensity = 0.8;
        }
    }

    setupScrollZoomInteraction() {
        let isUserInteracting = false;
        let interactionTimeout = null;

        if (this.controls) {
            this.controls.addEventListener("start", () => {
                isUserInteracting = true;
                if (interactionTimeout) clearTimeout(interactionTimeout);
            });
            this.controls.addEventListener("end", () => {
                interactionTimeout = setTimeout(() => {
                    isUserInteracting = false;
                }, 4000);
            });
        }

        let currentScrollStage = 0;

        window.addEventListener("scroll", () => {
            if (this.isTourRunning || isUserInteracting) return;

            const scrollY = window.scrollY;
            const facEl = document.getElementById("facilitiesSection");
            const tokenEl = document.getElementById("tokenSection");
            const plannerEl = document.getElementById("plannerSection");

            const facTop = facEl ? facEl.offsetTop - 300 : 550;
            const tokenTop = tokenEl ? tokenEl.offsetTop - 300 : 1100;
            const plannerTop = plannerEl ? plannerEl.offsetTop - 300 : 1700;

            let stage = 0;
            if (scrollY < facTop) {
                stage = 0; // Hero: Overview diorama
            } else if (scrollY >= facTop && scrollY < tokenTop) {
                stage = 1; // Stage 1: Zoom in to Building 1 (COE) and IAF Jet
            } else if (scrollY >= tokenTop && scrollY < plannerTop) {
                stage = 2; // Stage 2: Zoom in to Building 2 (MBA) and Xerox [X]
            } else {
                stage = 3; // Stage 3: Zoom in to Bottom-Left Central Canteen
            }

            if (stage !== currentScrollStage) {
                currentScrollStage = stage;
                if (stage === 0) {
                    this.animateCameraTo(new THREE.Vector3(0, 24, 32), new THREE.Vector3(0, 2, 0), 1200);
                } else if (stage === 1) {
                    this.animateCameraTo(new THREE.Vector3(0, 10, 8), new THREE.Vector3(0, 2.5, -6), 1200);
                } else if (stage === 2) {
                    this.animateCameraTo(new THREE.Vector3(-11.5, 5.2, 7.5), new THREE.Vector3(-14.0, 1.2, 2.5), 1200);
                } else if (stage === 3) {
                    this.animateCameraTo(new THREE.Vector3(-14.5, 6, 17), new THREE.Vector3(-17.5, 1.8, 12.0), 1200);
                }
            }
        }, { passive: true });
    }

    onResize() {
        if (!this.container || !this.renderer) return;
        const width = this.container.clientWidth;
        const height = this.container.clientHeight;
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
    }

    animate() {
        requestAnimationFrame(() => this.animate());

        if (this.controls) {
            this.controls.update();
        }

        const time = performance.now() * 0.001;

        // Smooth elevation of hovered building
        this.buildings.forEach(b => {
            b.userData.currentY += (b.userData.targetY - b.userData.currentY) * 0.12;
            b.position.y = b.userData.currentY;
        });

        // Rotate water sprinklers gently
        this.sprinklers.forEach((mist, idx) => {
            mist.rotation.y = time * 2.5 + idx;
        });

        // Move student footfall flow particles
        if (this.particles) {
            const pos = this.particles.geometry.attributes.position.array;
            for (let i = 0; i < pos.length; i += 3) {
                pos[i] += 0.04;
                if (pos[i] > 18) pos[i] = -18;
            }
            this.particles.geometry.attributes.position.needsUpdate = true;
        }

        this.renderer.render(this.scene, this.camera);
    }
}
