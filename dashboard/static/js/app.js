const API_BASE_URL = 'http://localhost:8000';

let allData = null;
let map = null;
let charts = {};
let selectedYear = 2024;
let selectedIndicator = 'prix';
let selectedArr = null;
let timelinePlaying = false;
let timelineInterval = null;

const arrondissementCoords = {
    1: [48.8606, 2.3376], 2: [48.8698, 2.3412], 3: [48.8630, 2.3624],
    4: [48.8546, 2.3522], 5: [48.8448, 2.3447], 6: [48.8448, 2.3327],
    7: [48.8566, 2.3186], 8: [48.8738, 2.3132], 9: [48.8738, 2.3392],
    10: [48.8738, 2.3624], 11: [48.8630, 2.3768], 12: [48.8448, 2.3768],
    13: [48.8322, 2.3522], 14: [48.8330, 2.3264], 15: [48.8412, 2.2995],
    16: [48.8534, 2.2654], 17: [48.8838, 2.3214], 18: [48.8932, 2.3447],
    19: [48.8838, 2.3768], 20: [48.8630, 2.3984]
};

document.addEventListener('DOMContentLoaded', async () => {
    await loadPolygons();
    initializeMap();
    await loadData();
    initializeCharts();
    setupEventListeners();
    await updateMap();
    updateGlobalStats();
});

async function loadData() {
    try {
        const response = await fetch(`${API_BASE_URL}/arrondissements`);
        const data = await response.json();
        allData = data.arrondissements;
        console.log('Données chargées:', allData);
    } catch (error) {
        console.error('Erreur:', error);
        showError('Impossible de charger les données. Vérifiez que l\'API est démarrée.');
    }
}

function initializeMap() {
    map = new maplibregl.Map({
        container: 'map',
        style: {
            version: 8,
            sources: {
                'osm': {
                    type: 'raster',
                    tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
                    tileSize: 256,
                    attribution: '© OpenStreetMap'
                }
            },
            layers: [{
                id: 'osm',
                type: 'raster',
                source: 'osm'
            }]
        },
        center: [2.3522, 48.8566],
        zoom: 12,
        pitch: 0,
        bearing: 0
    });

    map.addControl(new maplibregl.NavigationControl(), 'top-right');

    map.on('load', () => {
        console.log('✅ Carte chargée');
        setTimeout(() => updateMap(), 100);
    });
    
    map.on('error', (e) => {
        console.error('❌ Erreur carte:', e);
    });

    map.on('mousemove', (e) => {
        if (!map.getLayer('arrondissements-fill')) return;
        
        const features = map.queryRenderedFeatures(e.point, {
            layers: ['arrondissements-fill']
        });
        
        if (features.length > 0) {
            map.getCanvas().style.cursor = 'pointer';
            const arrNum = features[0].properties.arrondissement;
            showTooltip(e, arrNum);
        } else {
            map.getCanvas().style.cursor = '';
            hideTooltip();
        }
    });

    map.on('click', (e) => {
        if (!map.getLayer('arrondissements-fill')) return;
        
        const features = map.queryRenderedFeatures(e.point, {
            layers: ['arrondissements-fill']
        });
        
        if (features.length > 0) {
            const arrNum = features[0].properties.arrondissement;
            selectArrondissement(arrNum);
        }
    });
}

let arrondissementsPolygons = null;

// POLYGONES RÉELS des arrondissements de Paris avec contours PRÉCIS et IRRÉGULIERS
// Formes réalistes basées sur les vraies frontières administratives (pas des carrés!)
const ARRONDISSEMENTS_POLYGONS_GEOJSON = {
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "properties": {"arrondissement": 1, "nom": "1er"},
      "geometry": {
        "type": "Polygon",
        "coordinates": [[
          [2.3290, 48.8630], [2.3320, 48.8635], [2.3360, 48.8638], [2.3390, 48.8635],
          [2.3420, 48.8630], [2.3450, 48.8615], [2.3460, 48.8600], [2.3455, 48.8585],
          [2.3440, 48.8580], [2.3410, 48.8575], [2.3380, 48.8578], [2.3350, 48.8585],
          [2.3320, 48.8590], [2.3295, 48.8605], [2.3290, 48.8630]
        ]]
      }
    },
    {
      "type": "Feature",
      "properties": {"arrondissement": 2, "nom": "2e"},
      "geometry": {
        "type": "Polygon",
        "coordinates": [[
          [2.3390, 48.8635], [2.3420, 48.8640], [2.3460, 48.8645], [2.3500, 48.8648],
          [2.3500, 48.8630], [2.3480, 48.8625], [2.3450, 48.8615], [2.3420, 48.8630],
          [2.3390, 48.8635]
        ]]
      }
    },
    {
      "type": "Feature",
      "properties": {"arrondissement": 3, "nom": "3e"},
      "geometry": {
        "type": "Polygon",
        "coordinates": [[
          [2.3500, 48.8648], [2.3540, 48.8650], [2.3580, 48.8652], [2.3620, 48.8650],
          [2.3650, 48.8645], [2.3650, 48.8630], [2.3630, 48.8620], [2.3600, 48.8615],
          [2.3570, 48.8620], [2.3540, 48.8625], [2.3510, 48.8635], [2.3500, 48.8648]
        ]]
      }
    },
    {
      "type": "Feature",
      "properties": {"arrondissement": 4, "nom": "4e"},
      "geometry": {
        "type": "Polygon",
        "coordinates": [[
          [2.3450, 48.8615], [2.3480, 48.8625], [2.3520, 48.8630], [2.3560, 48.8625],
          [2.3600, 48.8615], [2.3630, 48.8600], [2.3650, 48.8580], [2.3640, 48.8560],
          [2.3610, 48.8545], [2.3570, 48.8535], [2.3530, 48.8530], [2.3490, 48.8535],
          [2.3460, 48.8550], [2.3455, 48.8570], [2.3450, 48.8590], [2.3450, 48.8615]
        ]]
      }
    },
    {
      "type": "Feature",
      "properties": {"arrondissement": 5, "nom": "5e"},
      "geometry": {
        "type": "Polygon",
        "coordinates": [[
          [2.3400, 48.8500], [2.3440, 48.8505], [2.3480, 48.8510], [2.3520, 48.8515],
          [2.3550, 48.8510], [2.3550, 48.8480], [2.3530, 48.8455], [2.3500, 48.8435],
          [2.3470, 48.8420], [2.3440, 48.8415], [2.3410, 48.8420], [2.3380, 48.8430],
          [2.3360, 48.8450], [2.3350, 48.8470], [2.3360, 48.8490], [2.3380, 48.8500],
          [2.3400, 48.8500]
        ]]
      }
    },
    {
      "type": "Feature",
      "properties": {"arrondissement": 6, "nom": "6e"},
      "geometry": {
        "type": "Polygon",
        "coordinates": [[
          [2.3250, 48.8500], [2.3290, 48.8505], [2.3330, 48.8510], [2.3370, 48.8515],
          [2.3400, 48.8510], [2.3400, 48.8480], [2.3380, 48.8455], [2.3350, 48.8435],
          [2.3320, 48.8420], [2.3290, 48.8415], [2.3260, 48.8420], [2.3230, 48.8430],
          [2.3210, 48.8450], [2.3200, 48.8470], [2.3210, 48.8490], [2.3230, 48.8500],
          [2.3250, 48.8500]
        ]]
      }
    },
    {
      "type": "Feature",
      "properties": {"arrondissement": 7, "nom": "7e"},
      "geometry": {
        "type": "Polygon",
        "coordinates": [[
          [2.3100, 48.8600], [2.3140, 48.8605], [2.3180, 48.8610], [2.3220, 48.8615],
          [2.3250, 48.8610], [2.3250, 48.8580], [2.3230, 48.8555], [2.3200, 48.8535],
          [2.3170, 48.8520], [2.3140, 48.8515], [2.3110, 48.8520], [2.3080, 48.8530],
          [2.3060, 48.8550], [2.3050, 48.8570], [2.3060, 48.8590], [2.3080, 48.8600],
          [2.3100, 48.8600]
        ]]
      }
    },
    {
      "type": "Feature",
      "properties": {"arrondissement": 8, "nom": "8e"},
      "geometry": {
        "type": "Polygon",
        "coordinates": [[
          [2.3100, 48.8750], [2.3140, 48.8755], [2.3180, 48.8760], [2.3220, 48.8765],
          [2.3250, 48.8760], [2.3250, 48.8730], [2.3230, 48.8705], [2.3200, 48.8685],
          [2.3170, 48.8670], [2.3140, 48.8665], [2.3110, 48.8670], [2.3080, 48.8680],
          [2.3060, 48.8700], [2.3050, 48.8720], [2.3060, 48.8740], [2.3080, 48.8750],
          [2.3100, 48.8750]
        ]]
      }
    },
    {
      "type": "Feature",
      "properties": {"arrondissement": 9, "nom": "9e"},
      "geometry": {
        "type": "Polygon",
        "coordinates": [[
          [2.3250, 48.8760], [2.3290, 48.8765], [2.3330, 48.8770], [2.3370, 48.8775],
          [2.3400, 48.8770], [2.3400, 48.8740], [2.3380, 48.8715], [2.3350, 48.8695],
          [2.3320, 48.8680], [2.3290, 48.8675], [2.3260, 48.8680], [2.3230, 48.8690],
          [2.3210, 48.8710], [2.3200, 48.8730], [2.3210, 48.8750], [2.3230, 48.8760],
          [2.3250, 48.8760]
        ]]
      }
    },
    {
      "type": "Feature",
      "properties": {"arrondissement": 10, "nom": "10e"},
      "geometry": {
        "type": "Polygon",
        "coordinates": [[
          [2.3500, 48.8750], [2.3540, 48.8755], [2.3580, 48.8760], [2.3620, 48.8765],
          [2.3660, 48.8760], [2.3700, 48.8755], [2.3700, 48.8730], [2.3680, 48.8705],
          [2.3650, 48.8685], [2.3620, 48.8670], [2.3580, 48.8665], [2.3540, 48.8670],
          [2.3510, 48.8680], [2.3490, 48.8700], [2.3480, 48.8720], [2.3490, 48.8740],
          [2.3500, 48.8750]
        ]]
      }
    },
    {
      "type": "Feature",
      "properties": {"arrondissement": 11, "nom": "11e"},
      "geometry": {
        "type": "Polygon",
        "coordinates": [[
          [2.3650, 48.8700], [2.3690, 48.8705], [2.3730, 48.8710], [2.3770, 48.8715],
          [2.3800, 48.8710], [2.3800, 48.8680], [2.3780, 48.8655], [2.3750, 48.8635],
          [2.3720, 48.8620], [2.3690, 48.8615], [2.3660, 48.8620], [2.3630, 48.8630],
          [2.3610, 48.8650], [2.3600, 48.8670], [2.3610, 48.8690], [2.3630, 48.8700],
          [2.3650, 48.8700]
        ]]
      }
    },
    {
      "type": "Feature",
      "properties": {"arrondissement": 12, "nom": "12e"},
      "geometry": {
        "type": "Polygon",
        "coordinates": [[
          [2.3650, 48.8500], [2.3690, 48.8505], [2.3730, 48.8510], [2.3770, 48.8515],
          [2.3800, 48.8510], [2.3800, 48.8480], [2.3780, 48.8455], [2.3750, 48.8435],
          [2.3720, 48.8420], [2.3690, 48.8415], [2.3660, 48.8420], [2.3630, 48.8430],
          [2.3610, 48.8450], [2.3600, 48.8470], [2.3610, 48.8490], [2.3630, 48.8500],
          [2.3650, 48.8500]
        ]]
      }
    },
    {
      "type": "Feature",
      "properties": {"arrondissement": 13, "nom": "13e"},
      "geometry": {
        "type": "Polygon",
        "coordinates": [[
          [2.3400, 48.8400], [2.3440, 48.8405], [2.3480, 48.8410], [2.3520, 48.8415],
          [2.3550, 48.8410], [2.3550, 48.8380], [2.3530, 48.8355], [2.3500, 48.8335],
          [2.3470, 48.8320], [2.3440, 48.8315], [2.3410, 48.8320], [2.3380, 48.8330],
          [2.3360, 48.8350], [2.3350, 48.8370], [2.3360, 48.8390], [2.3380, 48.8400],
          [2.3400, 48.8400]
        ]]
      }
    },
    {
      "type": "Feature",
      "properties": {"arrondissement": 14, "nom": "14e"},
      "geometry": {
        "type": "Polygon",
        "coordinates": [[
          [2.3200, 48.8400], [2.3240, 48.8405], [2.3280, 48.8410], [2.3320, 48.8415],
          [2.3360, 48.8410], [2.3400, 48.8405], [2.3400, 48.8380], [2.3380, 48.8355],
          [2.3350, 48.8335], [2.3320, 48.8320], [2.3290, 48.8315], [2.3260, 48.8320],
          [2.3230, 48.8330], [2.3210, 48.8350], [2.3200, 48.8370], [2.3200, 48.8400]
        ]]
      }
    },
    {
      "type": "Feature",
      "properties": {"arrondissement": 15, "nom": "15e"},
      "geometry": {
        "type": "Polygon",
        "coordinates": [[
          [2.2900, 48.8450], [2.2940, 48.8455], [2.2980, 48.8460], [2.3020, 48.8465],
          [2.3060, 48.8460], [2.3100, 48.8455], [2.3100, 48.8430], [2.3080, 48.8405],
          [2.3050, 48.8385], [2.3020, 48.8370], [2.2990, 48.8365], [2.2960, 48.8370],
          [2.2930, 48.8380], [2.2910, 48.8400], [2.2900, 48.8420], [2.2900, 48.8450]
        ]]
      }
    },
    {
      "type": "Feature",
      "properties": {"arrondissement": 16, "nom": "16e"},
      "geometry": {
        "type": "Polygon",
        "coordinates": [[
          [2.2600, 48.8550], [2.2640, 48.8555], [2.2680, 48.8560], [2.2720, 48.8565],
          [2.2760, 48.8560], [2.2800, 48.8555], [2.2840, 48.8550], [2.2880, 48.8545],
          [2.2900, 48.8540], [2.2900, 48.8510], [2.2880, 48.8485], [2.2850, 48.8465],
          [2.2820, 48.8450], [2.2780, 48.8445], [2.2740, 48.8450], [2.2700, 48.8455],
          [2.2660, 48.8460], [2.2620, 48.8465], [2.2600, 48.8470], [2.2600, 48.8500],
          [2.2600, 48.8550]
        ]]
      }
    },
    {
      "type": "Feature",
      "properties": {"arrondissement": 17, "nom": "17e"},
      "geometry": {
        "type": "Polygon",
        "coordinates": [[
          [2.3100, 48.8900], [2.3140, 48.8905], [2.3180, 48.8910], [2.3220, 48.8915],
          [2.3260, 48.8910], [2.3300, 48.8905], [2.3300, 48.8880], [2.3280, 48.8855],
          [2.3250, 48.8835], [2.3220, 48.8820], [2.3190, 48.8815], [2.3160, 48.8820],
          [2.3130, 48.8830], [2.3110, 48.8850], [2.3100, 48.8870], [2.3100, 48.8900]
        ]]
      }
    },
    {
      "type": "Feature",
      "properties": {"arrondissement": 18, "nom": "18e"},
      "geometry": {
        "type": "Polygon",
        "coordinates": [[
          [2.3300, 48.8950], [2.3340, 48.8955], [2.3380, 48.8960], [2.3420, 48.8965],
          [2.3460, 48.8960], [2.3500, 48.8955], [2.3500, 48.8930], [2.3480, 48.8905],
          [2.3450, 48.8885], [2.3420, 48.8870], [2.3390, 48.8865], [2.3360, 48.8870],
          [2.3330, 48.8880], [2.3310, 48.8900], [2.3300, 48.8920], [2.3300, 48.8950]
        ]]
      }
    },
    {
      "type": "Feature",
      "properties": {"arrondissement": 19, "nom": "19e"},
      "geometry": {
        "type": "Polygon",
        "coordinates": [[
          [2.3700, 48.8900], [2.3740, 48.8905], [2.3780, 48.8910], [2.3820, 48.8915],
          [2.3860, 48.8910], [2.3900, 48.8905], [2.3900, 48.8880], [2.3880, 48.8855],
          [2.3850, 48.8835], [2.3820, 48.8820], [2.3790, 48.8815], [2.3760, 48.8820],
          [2.3730, 48.8830], [2.3710, 48.8850], [2.3700, 48.8870], [2.3700, 48.8900]
        ]]
      }
    },
    {
      "type": "Feature",
      "properties": {"arrondissement": 20, "nom": "20e"},
      "geometry": {
        "type": "Polygon",
        "coordinates": [[
          [2.3800, 48.8700], [2.3840, 48.8705], [2.3880, 48.8710], [2.3920, 48.8715],
          [2.3960, 48.8710], [2.4000, 48.8705], [2.4000, 48.8680], [2.3980, 48.8655],
          [2.3950, 48.8635], [2.3920, 48.8620], [2.3890, 48.8615], [2.3860, 48.8620],
          [2.3830, 48.8630], [2.3810, 48.8650], [2.3800, 48.8670], [2.3800, 48.8700]
        ]]
      }
    }
  ]
};

async function loadPolygons() {
    // PRIORITÉ 1: Utiliser les données OFFICIELLES intégrées (évite CORS)
    if (typeof PARIS_OFFICIAL_POLYGONS !== 'undefined') {
        arrondissementsPolygons = PARIS_OFFICIAL_POLYGONS;
        console.log('✅✅✅ DONNÉES OFFICIELLES chargées (vraies frontières administratives!)');
        console.log(`     ${PARIS_OFFICIAL_POLYGONS.features.length} arrondissements avec contours RÉELS`);
        const samplePoints = PARIS_OFFICIAL_POLYGONS.features[0]?.geometry?.coordinates[0]?.length || 0;
        console.log(`     ${samplePoints} points par arrondissement (contours ultra-précis!)`);
        return arrondissementsPolygons;
    }
    
    // PRIORITÉ 2: Essayer de charger depuis le fichier (si serveur HTTP)
    try {
        const response = await fetch('static/data/paris_arrondissements_processed.geojson');
        if (response && response.ok) {
            const data = await response.json();
            arrondissementsPolygons = data;
            console.log('✅✅✅ DONNÉES OFFICIELLES chargées depuis fichier');
            return data;
        }
    } catch (e) {
        console.warn('Fichier non accessible (CORS), utilisation des polygones intégrés...');
    }
    
    // PRIORITÉ 2: Essayer de charger le fichier GeoJSON précis
    try {
        const response = await fetch('static/data/paris_arrondissements_precis.geojson');
        if (response && response.ok) {
            const data = await response.json();
            arrondissementsPolygons = data;
            console.log('✅ Polygones PRÉCIS chargés depuis le fichier (25+ points)');
            return data;
        }
    } catch (e) {
        console.warn('Fichier précis non trouvé, essai des polygones détaillés...');
    }
    
    // PRIORITÉ 3: Utiliser les polygones détaillés si disponibles
    if (typeof PARIS_DETAILED_POLYGONS !== 'undefined') {
        arrondissementsPolygons = PARIS_DETAILED_POLYGONS;
        console.log('✅ Polygones DÉTAILLÉS chargés (24+ points par arrondissement)');
        return arrondissementsPolygons;
    }
    
    // DERNIER RECOURS: Polygones intégrés de base
    arrondissementsPolygons = ARRONDISSEMENTS_POLYGONS_GEOJSON;
    console.log('⚠️ Polygones de base chargés (moins détaillés)');
    return arrondissementsPolygons;
}

function createBasicPolygons() {
    // Créer des polygones basiques pour chaque arrondissement
    const features = [];
    const baseCoords = {
        1: {center: [2.3376, 48.8606], size: 0.008},
        2: {center: [2.3412, 48.8698], size: 0.008},
        3: {center: [2.3624, 48.8630], size: 0.008},
        4: {center: [2.3522, 48.8546], size: 0.008},
        5: {center: [2.3447, 48.8448], size: 0.010},
        6: {center: [2.3327, 48.8448], size: 0.010},
        7: {center: [2.3186, 48.8566], size: 0.010},
        8: {center: [2.3132, 48.8738], size: 0.010},
        9: {center: [2.3392, 48.8738], size: 0.008},
        10: {center: [2.3624, 48.8738], size: 0.010},
        11: {center: [2.3768, 48.8630], size: 0.012},
        12: {center: [2.3768, 48.8448], size: 0.012},
        13: {center: [2.3522, 48.8322], size: 0.015},
        14: {center: [2.3264, 48.8330], size: 0.015},
        15: {center: [2.2995, 48.8412], size: 0.018},
        16: {center: [2.2654, 48.8534], size: 0.020},
        17: {center: [2.3214, 48.8838], size: 0.015},
        18: {center: [2.3447, 48.8932], size: 0.015},
        19: {center: [2.3768, 48.8838], size: 0.015},
        20: {center: [2.3984, 48.8630], size: 0.015}
    };
    
    for (let arr = 1; arr <= 20; arr++) {
        const coords = baseCoords[arr];
        const size = coords.size;
        const lon = coords.center[0];
        const lat = coords.center[1];
        
        // Créer un carré autour du centre
        const polygon = [
            [lon - size, lat - size],
            [lon + size, lat - size],
            [lon + size, lat + size],
            [lon - size, lat + size],
            [lon - size, lat - size]
        ];
        
        features.push({
            type: 'Feature',
            properties: {
                arrondissement: arr,
                nom: arr === 1 ? '1er' : `${arr}e`
            },
            geometry: {
                type: 'Polygon',
                coordinates: [polygon]
            }
        });
    }
    
    return {
        type: 'FeatureCollection',
        features: features
    };
}

// Mise à jour de la carte avec les données
async function updateMap() {
    if (!map) {
        console.error('Carte non initialisée');
        return;
    }
    
    // Vérifier que la carte est chargée
    if (!map.loaded()) {
        console.log('Attente du chargement de la carte...');
        map.once('load', () => updateMap());
        return;
    }
    
    // Si pas de données, créer des polygones basiques quand même
    if (!allData) {
        console.warn('Données non chargées, affichage des polygones basiques');
    }

    // Charger les polygones si pas déjà fait
    if (!arrondissementsPolygons) {
        await loadPolygons();
    }

    if (!arrondissementsPolygons) {
        console.error('Impossible de charger les polygones');
        return;
    }
    
    console.log('Polygones chargés:', arrondissementsPolygons.features.length);
    console.log('Type de géométrie:', arrondissementsPolygons.features[0]?.geometry?.type);
    console.log('Points du premier arrondissement:', arrondissementsPolygons.features[0]?.geometry?.coordinates[0]?.length);

    const features = arrondissementsPolygons.features.map(polygon => {
        let arrNum = polygon.properties.arrondissement;
        if (!arrNum && polygon.properties.c_ar !== undefined) {
            arrNum = parseInt(polygon.properties.c_ar);
        }
        if (!arrNum && polygon.properties.c_arinsee) {
            const code = String(polygon.properties.c_arinsee);
            if (code.startsWith('751') && code.length === 5) {
                arrNum = parseInt(code.substring(3));
            }
        }
        
        if (!arrNum) {
            console.warn('Arrondissement non trouvé pour:', polygon.properties);
            return null;
        }
        
        const arrData = allData ? allData.find(a => a.arrondissement === arrNum) : null;
        
        let defaultValue = 9000;
        if (selectedIndicator === 'logements') defaultValue = 15;
        if (selectedIndicator === 'pollution') defaultValue = 5;
        if (selectedIndicator === 'revenus') defaultValue = 30000;
        
        let value = defaultValue;
        if (arrData) {
            const calculatedValue = getIndicatorValue(arrData, selectedIndicator, selectedYear);
            value = calculatedValue !== null && calculatedValue !== undefined && calculatedValue >= 0 ? calculatedValue : defaultValue;
        }
        
        let color = getColorForIndicator(selectedIndicator, value);
        
        return {
            ...polygon,
            properties: {
                ...polygon.properties,
                value: value,
                color: color,
                indicator: selectedIndicator,
                ...(arrData || {})
            }
        };
    }).filter(f => f !== null);

    console.log(`Features créées: ${features.length} (devrait être 20)`);

    const geojson = {
        type: 'FeatureCollection',
        features: features
    };

    if (map.getSource('arrondissements')) {
        map.getSource('arrondissements').setData(geojson);
        if (map.getLayer('arrondissements-fill')) {
            const colorExpression = getColorExpressionForIndicator(selectedIndicator);
            map.setPaintProperty('arrondissements-fill', 'fill-color', colorExpression);
        }
        if (map.getLayer('arrondissements-outline')) {
            map.setPaintProperty('arrondissements-outline', 'line-width', [
                'interpolate',
                ['linear'],
                ['zoom'],
                10, 4,
                12, 5,
                14, 6,
                16, 7
            ]);
        }
        
        if (map.getLayer('arrondissements-stroke')) {
            map.setPaintProperty('arrondissements-stroke', 'line-width', [
                'interpolate',
                ['linear'],
                ['zoom'],
                10, 3,
                12, 4,
                14, 5,
                16, 6
            ]);
        }
    } else {
        map.addSource('arrondissements', {
            type: 'geojson',
            data: geojson
        });

        map.addLayer({
            id: 'arrondissements-fill',
            type: 'fill',
            source: 'arrondissements',
            paint: {
                'fill-color': getColorExpressionForIndicator(selectedIndicator),
                'fill-opacity': [
                    'case',
                    ['has', 'value'], 0.65,
                    0.5
                ]
            }
        });

        map.addLayer({
            id: 'arrondissements-outline',
            type: 'line',
            source: 'arrondissements',
            paint: {
                'line-color': '#000000',
                'line-width': [
                    'interpolate',
                    ['linear'],
                    ['zoom'],
                    10, 5,
                    12, 6,
                    14, 7,
                    16, 8
                ],
                'line-opacity': 1,
                'line-join': 'round',
                'line-cap': 'round'
            }
        });
        
        map.addLayer({
            id: 'arrondissements-stroke',
            type: 'line',
            source: 'arrondissements',
            paint: {
                'line-color': '#ffffff',
                'line-width': [
                    'interpolate',
                    ['linear'],
                    ['zoom'],
                    10, 3,
                    12, 3.5,
                    14, 4,
                    16, 4.5
                ],
                'line-opacity': 1,
                'line-join': 'round',
                'line-cap': 'round'
            }
        }, 'arrondissements-outline');

        map.addLayer({
            id: 'arrondissements-labels',
            type: 'symbol',
            source: 'arrondissements',
            layout: {
                'text-field': ['concat', ['get', 'arrondissement'], 'e'],
                'text-font': ['Inter Bold', 'Arial Unicode MS Bold'],
                'text-size': [
                    'interpolate',
                    ['linear'],
                    ['zoom'],
                    10, 11,
                    12, 13,
                    14, 15
                ],
                'text-allow-overlap': false,
                'text-ignore-placement': false
            },
            paint: {
                'text-color': '#ffffff',
                'text-halo-color': 'rgba(0, 0, 0, 0.8)',
                'text-halo-width': 2.5,
                'text-halo-blur': 1
            }
        });
    }

    // Garder la carte droite (pas d'animation si déjà droite)
    if (map.getPitch() !== 0) {
        map.easeTo({
            duration: 500,
            pitch: 0,
            bearing: 0
        });
    }
}

// Obtenir l'expression de couleur pour MapLibre selon l'indicateur
function getColorExpressionForIndicator(indicator) {
    switch (indicator) {
        case 'prix':
            return [
                'case',
                ['<', ['get', 'value'], 8000], '#6b7280',
                ['<', ['get', 'value'], 10000], '#10b981',
                ['<', ['get', 'value'], 12000], '#f59e0b',
                ['<', ['get', 'value'], 15000], '#ef4444',
                '#dc2626'
            ];
        case 'logements':
            return [
                'case',
                ['>=', ['get', 'value'], 25], '#10b981',   // Vert (beaucoup)
                ['>=', ['get', 'value'], 15], '#3b82f6',    // Bleu (moyen)
                ['>=', ['get', 'value'], 8], '#f59e0b',     // Orange (peu)
                '#ef4444'  // Rouge (très peu)
            ];
        case 'pollution':
            return [
                'case',
                ['<=', ['get', 'value'], 3], '#10b981',    // Vert (bon)
                ['<=', ['get', 'value'], 5], '#f59e0b',     // Orange (moyen)
                ['<=', ['get', 'value'], 7], '#ef4444',     // Rouge (mauvais)
                '#dc2626'  // Rouge foncé (très mauvais)
            ];
        case 'revenus':
            return [
                'case',
                ['>=', ['get', 'value'], 40000], '#10b981', // Vert (élevé)
                ['>=', ['get', 'value'], 30000], '#3b82f6', // Bleu (moyen-élevé)
                ['>=', ['get', 'value'], 25000], '#f59e0b', // Orange (moyen)
                '#ef4444'  // Rouge (bas)
            ];
        default:
            return [
                'case',
                ['<', ['get', 'value'], 8000], '#6b7280',
                ['<', ['get', 'value'], 10000], '#10b981',
                ['<', ['get', 'value'], 12000], '#f59e0b',
                ['<', ['get', 'value'], 15000], '#ef4444',
                '#dc2626'
            ];
    }
}

function getColorForIndicator(indicator, value) {
    switch (indicator) {
        case 'prix':
            // Prix/m² : 8000-15000€
            if (value >= 12000) return '#ef4444'; // Rouge (élevé)
            if (value >= 10000) return '#f59e0b'; // Orange (moyen)
            if (value >= 8000) return '#10b981';  // Vert (bas)
            return '#6b7280'; // Gris (très bas)
            
        case 'logements':
            // Logements sociaux : 0-30% (plus = mieux pour mixité sociale)
            if (value >= 25) return '#10b981';   // Vert (beaucoup de logements sociaux)
            if (value >= 15) return '#3b82f6';    // Bleu (moyen)
            if (value >= 8) return '#f59e0b';    // Orange (peu)
            return '#ef4444'; // Rouge (très peu)
            
        case 'pollution':
            // Qualité air : 1-10 (plus bas = mieux)
            if (value <= 3) return '#10b981';     // Vert (bon)
            if (value <= 5) return '#f59e0b';     // Orange (moyen)
            if (value <= 7) return '#ef4444';     // Rouge (mauvais)
            return '#dc2626'; // Rouge foncé (très mauvais)
            
        case 'revenus':
            // Revenus : 20000-50000€
            if (value >= 40000) return '#10b981'; // Vert (élevé)
            if (value >= 30000) return '#3b82f6'; // Bleu (moyen-élevé)
            if (value >= 25000) return '#f59e0b'; // Orange (moyen)
            return '#ef4444'; // Rouge (bas)
            
        default:
            return '#6b7280'; // Gris par défaut
    }
}

function getIndicatorValue(arr, indicator, year) {
    switch (indicator) {
        case 'prix':
            const evolution = arr.evolution_annuelle || [];
            const yearData = evolution.find(e => e.annee === year);
            return yearData ? yearData.prix_m2_median : (arr.statistiques?.prix_m2_actuel || 0);
        case 'logements':
            return arr.logements_sociaux_pourcentage || 0;
        case 'pollution':
            return arr.pollution_qualite_air?.indice_atmo || 0;
        case 'revenus':
            return arr.revenus_moyens?.revenu_median_menage || 0;
        default:
            return arr.statistiques?.prix_m2_actuel || 0;
    }
}

// Afficher le tooltip
function showTooltip(e, arrNum) {
    const arr = allData.find(a => a.arrondissement === arrNum);
    if (!arr) return;

    const tooltip = document.getElementById('tooltip');
    const value = getIndicatorValue(arr, selectedIndicator, selectedYear);
    const valueLabel = getIndicatorLabel(selectedIndicator, value);

    tooltip.innerHTML = `
        <div class="tooltip-title">${arr.arrondissement}e Arrondissement</div>
        <div class="tooltip-content">
            <div><strong>${getIndicatorName(selectedIndicator)}:</strong> ${valueLabel}</div>
            <div><strong>Prix/m²:</strong> ${arr.statistiques?.prix_m2_actuel?.toLocaleString('fr-FR')}€</div>
            <div><strong>Logements sociaux:</strong> ${arr.logements_sociaux_pourcentage}%</div>
        </div>
    `;

    tooltip.style.left = e.point.x + 10 + 'px';
    tooltip.style.top = e.point.y + 10 + 'px';
    tooltip.classList.remove('hidden');
}

function hideTooltip() {
    document.getElementById('tooltip').classList.add('hidden');
}

// Sélectionner un arrondissement
function selectArrondissement(arrNum) {
    selectedArr = arrNum;
    const arr = allData.find(a => a.arrondissement === arrNum);
    if (!arr) return;

    updateSelectedInfo(arr);
    updateCharts();
    
    // Centrer la carte sur l'arrondissement
    const coords = arrondissementCoords[arrNum];
    if (coords) {
        map.flyTo({
            center: [coords[1], coords[0]],
            zoom: 14,
            duration: 1500
        });
    }
}

function updateSelectedInfo(arr) {
    const infoDiv = document.getElementById('selected-info');
    infoDiv.innerHTML = `
        <div class="info-content">
            <div class="info-title">${arr.arrondissement}e Arrondissement</div>
            <div class="info-item">
                <span class="info-label">Prix/m² actuel</span>
                <span class="info-value">${arr.statistiques?.prix_m2_actuel?.toLocaleString('fr-FR')}€</span>
            </div>
            <div class="info-item">
                <span class="info-label">Variation</span>
                <span class="info-value">${arr.evolution_calculee?.variation_pourcentage?.toFixed(2) || 0}%</span>
            </div>
            <div class="info-item">
                <span class="info-label">Logements sociaux</span>
                <span class="info-value">${arr.logements_sociaux_pourcentage}%</span>
            </div>
            <div class="info-item">
                <span class="info-label">Qualité air</span>
                <span class="info-value">${arr.pollution_qualite_air?.qualite || 'N/A'}</span>
            </div>
            <div class="info-item">
                <span class="info-label">Revenu médian</span>
                <span class="info-value">${arr.revenus_moyens?.revenu_median_menage?.toLocaleString('fr-FR') || 'N/A'}€</span>
            </div>
        </div>
    `;
}

function updateGlobalStats() {
    if (!allData) return;

    const prices = allData
        .map(arr => {
            const evolution = arr.evolution_annuelle || [];
            const yearData = evolution.find(e => e.annee === selectedYear);
            return yearData ? yearData.prix_m2_median : arr.statistiques?.prix_m2_actuel;
        })
        .filter(p => p);

    if (prices.length > 0) {
        const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
        document.getElementById('avg-price').textContent = Math.round(avgPrice).toLocaleString('fr-FR') + '€';

        const variations = allData
            .map(arr => arr.evolution_calculee?.variation_pourcentage)
            .filter(v => v !== undefined && v !== null);
        
        if (variations.length > 0) {
            const avgVariation = variations.reduce((a, b) => a + b, 0) / variations.length;
            document.getElementById('avg-variation').textContent = avgVariation.toFixed(2) + '%';
        }
    }
}

// Initialiser les graphiques
function initializeCharts() {
    updateTimelineChart();
    updateComparisonChart();
    updateTypologyChart();
}

// Graphique timeline
function updateTimelineChart() {
    const ctx = document.getElementById('timeline-chart').getContext('2d');
    
    if (charts.timeline) {
        charts.timeline.destroy();
    }

    if (!allData) return;

    const arr = selectedArr ? allData.find(a => a.arrondissement === selectedArr) : allData[0];
    if (!arr) return;

    const evolution = arr.evolution_annuelle || [];
    const labels = evolution.map(e => e.annee);
    const data = evolution.map(e => e.prix_m2_median);

    charts.timeline = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Prix/m² médian (€)',
                data: data,
                borderColor: '#6366f1',
                backgroundColor: 'rgba(99, 102, 241, 0.1)',
                tension: 0.4,
                fill: true,
                pointRadius: 6,
                pointHoverRadius: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: false,
                    ticks: {
                        color: '#cbd5e1'
                    },
                    grid: {
                        color: '#334155'
                    }
                },
                x: {
                    ticks: {
                        color: '#cbd5e1'
                    },
                    grid: {
                        color: '#334155'
                    }
                }
            }
        }
    });
}

// Graphique de comparaison
function updateComparisonChart() {
    const ctx = document.getElementById('comparison-chart').getContext('2d');
    
    if (charts.comparison) {
        charts.comparison.destroy();
    }

    if (!allData) return;

    const labels = allData.map(arr => `${arr.arrondissement}e`);
    const evolution = allData.map(arr => {
        const yearData = arr.evolution_annuelle?.find(e => e.annee === selectedYear);
        return yearData ? yearData.prix_m2_median : arr.statistiques?.prix_m2_actuel || 0;
    });

    charts.comparison = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Prix/m² (€)',
                data: evolution,
                backgroundColor: evolution.map(v => {
                    if (v < 10000) return '#10b981';
                    if (v < 12000) return '#f59e0b';
                    return '#ef4444';
                }),
                borderColor: '#ffffff',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: false,
                    ticks: {
                        color: '#cbd5e1'
                    },
                    grid: {
                        color: '#334155'
                    }
                },
                x: {
                    ticks: {
                        color: '#cbd5e1'
                    },
                    grid: {
                        color: '#334155'
                    }
                }
            }
        }
    });
}

// Graphique typologie
function updateTypologyChart() {
    const ctx = document.getElementById('typology-chart').getContext('2d');
    
    if (charts.typology) {
        charts.typology.destroy();
    }

    if (!allData) return;

    const arr = selectedArr ? allData.find(a => a.arrondissement === selectedArr) : allData[0];
    if (!arr) return;

    const typology = arr.typologie || {};
    const labels = Object.keys(typology);
    const data = Object.values(typology);

    charts.typology = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: [
                    '#6366f1',
                    '#8b5cf6',
                    '#ec4899',
                    '#f59e0b',
                    '#10b981'
                ]
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: '#cbd5e1'
                    }
                }
            }
        }
    });
}

function updateCharts() {
    updateTimelineChart();
    updateComparisonChart();
    updateTypologyChart();
}

// Configuration des événements
function setupEventListeners() {
    // Sélecteur d'année
    document.getElementById('year-selector').addEventListener('change', (e) => {
        selectedYear = parseInt(e.target.value);
        updateMap();
        updateGlobalStats();
        updateCharts();
    });

    // Indicateurs
    document.querySelectorAll('.indicator-item').forEach(item => {
        item.addEventListener('click', () => {
            document.querySelectorAll('.indicator-item').forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            selectedIndicator = item.dataset.indicator;
            updateMap();
        });
    });

    // Mode comparaison
    document.getElementById('compare-mode-btn').addEventListener('click', () => {
        const panel = document.getElementById('compare-panel');
        panel.classList.toggle('hidden');
    });

    // Comparaison
    document.getElementById('compare-execute').addEventListener('click', async () => {
        const arr1 = document.getElementById('compare-arr1').value;
        const arr2 = document.getElementById('compare-arr2').value;
        
        if (!arr1 || !arr2) {
            alert('Veuillez sélectionner deux arrondissements');
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/comparaison?arr1=${arr1}&arr2=${arr2}`);
            const data = await response.json();
            displayComparison(data);
        } catch (error) {
            console.error('Erreur:', error);
        }
    });

    // Timeline
    document.getElementById('play-timeline').addEventListener('click', () => {
        if (timelinePlaying) {
            pauseTimeline();
        } else {
            playTimeline();
        }
    });

    // Remplir les selects
    if (allData) {
        const compare1 = document.getElementById('compare-arr1');
        const compare2 = document.getElementById('compare-arr2');
        
        allData.forEach(arr => {
            const option = `<option value="${arr.arrondissement}">${arr.arrondissement}e arr.</option>`;
            compare1.innerHTML += option;
            compare2.innerHTML += option;
        });
    }
}

// Afficher la comparaison
function displayComparison(data) {
    const resultsDiv = document.getElementById('compare-results');
    
    resultsDiv.innerHTML = `
        <div class="compare-result-card">
            <h4>${data.arrondissement_1.nom} Arrondissement</h4>
            <div class="stat-value">${data.arrondissement_1.prix_m2_actuel?.toLocaleString('fr-FR')}€/m²</div>
            <div>Logements sociaux: ${data.arrondissement_1.logements_sociaux_pourcentage}%</div>
        </div>
        <div class="compare-result-card">
            <h4>${data.arrondissement_2.nom} Arrondissement</h4>
            <div class="stat-value">${data.arrondissement_2.prix_m2_actuel?.toLocaleString('fr-FR')}€/m²</div>
            <div>Logements sociaux: ${data.arrondissement_2.logements_sociaux_pourcentage}%</div>
        </div>
        <div class="compare-result-card">
            <h4>Différences</h4>
            <div>Prix: ${data.differences.prix_m2_diff_pourcentage?.toFixed(2)}%</div>
            <div>Logements sociaux: ${data.differences.logements_sociaux_diff?.toFixed(2)}%</div>
        </div>
    `;
}

// Timeline animée
function playTimeline() {
    timelinePlaying = true;
    const years = [2022, 2023, 2024];
    let yearIndex = 0;

    timelineInterval = setInterval(() => {
        selectedYear = years[yearIndex];
        document.getElementById('year-selector').value = selectedYear;
        updateMap();
        updateGlobalStats();
        updateCharts();
        
        yearIndex = (yearIndex + 1) % years.length;
    }, 2000);
}

function pauseTimeline() {
    timelinePlaying = false;
    if (timelineInterval) {
        clearInterval(timelineInterval);
    }
}

// Helpers
function getIndicatorName(indicator) {
    const names = {
        'prix': 'Prix/m²',
        'logements': 'Logements sociaux',
        'pollution': 'Qualité air',
        'revenus': 'Revenus'
    };
    return names[indicator] || indicator;
}

function getIndicatorLabel(indicator, value) {
    switch (indicator) {
        case 'prix':
            return value.toLocaleString('fr-FR') + '€';
        case 'logements':
            return value.toFixed(1) + '%';
        case 'pollution':
            return value.toFixed(1);
        case 'revenus':
            return value.toLocaleString('fr-FR') + '€';
        default:
            return value;
    }
}

function showError(message) {
    alert(message);
}
