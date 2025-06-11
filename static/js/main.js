// ========== 地图初始化 ==========
let map = L.map('map', {
    center: [23.1575, 113.5218],
    zoom: 14,
    zoomControl: true
});
// 明亮底图
L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; <a href="https://carto.com/attributions">CARTO</a> & OSM',
    maxZoom: 19
}).addTo(map);

// 添加比例尺控件
L.control.scale({
    position: 'bottomleft',
    metric: true,
    imperial: false,
    maxWidth: 200
}).addTo(map);

// ========== 道路类型中文说明 ==========
const roadTypeDescriptions = {
    'motorway': '高速公路 - 最高等级的封闭式道路，通常有多车道和中央分隔带',
    'motorway_link': '高速公路匝道 - 连接高速公路的出入口匝道',
    'trunk': '主干道 - 重要的长距离道路，通常连接城市间',
    'trunk_link': '主干道连接线 - 连接主干道的匝道或连接线',
    'primary': '主要道路 - 连接大城镇的重要道路',
    'primary_link': '主要道路连接线 - 连接主要道路的匝道',
    'secondary': '次要道路 - 连接中等城镇和重要地区的道路',
    'secondary_link': '次要道路连接线 - 连接次要道路的匝道',
    'tertiary': '三级道路 - 连接小城镇和村庄的道路',
    'tertiary_link': '三级道路连接线 - 连接三级道路的匝道',
    'unclassified': '未分类道路 - 公共道路但未明确分类',
    'residential': '住宅道路 - 主要用于通往住宅区的道路',
    'living_street': '生活街道 - 行人和车辆共享的低速街道',
    'service': '服务道路 - 通往建筑物、停车场等的道路',
    'pedestrian': '步行街 - 主要供行人使用的街道',
    'track': '小径 - 农用或林用道路',
    'bus_guideway': '公交专用道 - 专供公交车行驶的道路',
    'escape': '避险车道 - 紧急避险用的车道',
    'raceway': '赛道 - 专用赛车道',
    'road': '一般道路 - 未进一步分类的道路',
    'footway': '人行道 - 专供行人使用的道路',
    'bridleway': '马道 - 供马匹通行的道路',
    'steps': '台阶 - 楼梯或台阶',
    'path': '小路 - 供行人或非机动车使用的小路',
    'cycleway': '自行车道 - 专供自行车使用的道路'
};

// ========== 道路颜色配置 ==========
function getRoadColor(type) {
    if (!type) return '#888888';
    if (type.includes('motorway')) return '#e74c3c';      // 红色 - 高速公路
    if (type.includes('trunk')) return '#f39c12';         // 橙色 - 主干道
    if (type.includes('primary')) return '#f1c40f';       // 黄色 - 主要道路
    if (type.includes('secondary')) return '#2ecc71';     // 绿色 - 次要道路
    if (type.includes('tertiary')) return '#3498db';      // 蓝色 - 三级道路
    if (type.includes('residential')) return '#9b59b6';   // 紫色 - 住宅道路
    if (type.includes('unclassified')) return '#95a5a6';  // 灰色 - 未分类道路
    if (type.includes('service')) return '#e67e22';       // 深橙色 - 服务道路
    if (type.includes('pedestrian')) return '#1abc9c';    // 青色 - 步行街
    if (type.includes('track')) return '#8e44ad';         // 深紫色 - 小径
    if (type.includes('footway')) return '#34495e';       // 深灰色 - 人行道
    if (type.includes('cycleway')) return '#27ae60';      // 深绿色 - 自行车道
    if (type.includes('path')) return '#7f8c8d';          // 中灰色 - 小路
    return '#888888';  // 默认灰色
}

// ========== 地址定位 ==========
document.getElementById('locate-btn').onclick = function() {
    let addr = document.getElementById('address').value.trim();
    if (!addr) return;
    fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(addr)}`)
        .then(r => r.json()).then(res => {
            if (res && res.length > 0) {
                let lat = parseFloat(res[0].lat), lon = parseFloat(res[0].lon);
                map.setView([lat, lon], 16);
            } else {
                alert('未找到该地址');
            }
        });
};

// ========== 全局状态管理 ==========
let currentTool = 'select'; // 'select', 'circle', 'rectangle', 'polygon'
let selectedLayer = null;
let isCreating = false; // 是否正在创建模式
let drawnItems = new L.FeatureGroup();
map.addLayer(drawnItems);

// 控制手柄和预览相关
let controlHandles = [];
let previewLayer = null;
let polygonPoints = [];

// 数据相关
let geojsonLayer = null;
let currentData = null;
let lastRequestData = null;
let originalGeoJSON = null;

// 实时信息更新
let realtimeUpdateTimer = null;

// ========== 工具切换系统 ==========
document.getElementById('btn-select').onclick = () => setTool('select');
document.getElementById('btn-circle').onclick = () => setTool('circle');
document.getElementById('btn-rectangle').onclick = () => setTool('rectangle');
document.getElementById('btn-polygon').onclick = () => setTool('polygon');

function setTool(tool) {
    // 清理当前状态
    clearPreview();
    clearPolygonDrawing();
    exitCreatingMode();
    
    // 如果切换到选择工具，清除当前选择状态
    if (tool === 'select') {
        clearSelection();
    }
    
    currentTool = tool;
    
    // 更新按钮状态
    document.querySelectorAll('.tool-btn').forEach(btn => {
        btn.classList.remove('active', 'creating');
    });
    document.getElementById(`btn-${tool}`).classList.add('active');
    
    // 显示对应的参数栏
    document.querySelectorAll('.param-group').forEach(group => group.classList.remove('active'));
    document.getElementById(`params-${tool}`).classList.add('active');
    
    // 更新状态提示
    updateStatusHint();
    
    // 设置地图交互
    setupMapInteraction();
}

function enterCreatingMode(tool) {
    if (isCreating) return;
    
    isCreating = true;
    const toolBtn = document.getElementById(`btn-${tool}`);
    if (toolBtn) {
        toolBtn.classList.add('creating');
    }
    
    // 禁用地图拖拽用于创建
    map.dragging.disable();
    
    updateStatusHint();
}

function exitCreatingMode() {
    if (!isCreating) return;
    
    isCreating = false;
    document.querySelectorAll('.tool-btn').forEach(btn => btn.classList.remove('creating'));
    
    // 恢复地图拖拽
    map.dragging.enable();
    
    updateStatusHint();
}

function updateStatusHint() {
    const statusHint = document.getElementById('status-hint');
    
    // 如果状态提示元素不存在，直接返回（新布局中已移除）
    if (!statusHint) return;
    
    if (isCreating) {
        const hints = {
            'circle': '创建圆形：点击地图设置中心点',
            'rectangle': '创建矩形：点击或拖拽创建',
            'polygon': '创建多边形：点击添加顶点，Enter完成'
        };
        statusHint.textContent = hints[currentTool] || '';
    } else {
        const hints = {
            'select': selectedLayer ? '已选中对象，可直接拖拽控制手柄编辑' : '选择工具：点击对象选择，点击空白取消选择',
            'circle': '圆形工具：点击激活创建模式',
            'rectangle': '矩形工具：点击激活创建模式',
            'polygon': '多边形工具：点击激活创建模式'
        };
        statusHint.textContent = hints[currentTool] || '';
    }
}

function updateSelectionInfo() {
    const selectionInfo = document.getElementById('selection-info');
    
    // 如果选择信息元素不存在，直接跳过显示部分（新布局中已移除）
    if (selectionInfo) {
        if (selectedLayer) {
            let info = '';
            if (selectedLayer.getRadius) {
                info = `圆形 - 半径: ${Math.round(selectedLayer.getRadius())}m`;
            } else if (selectedLayer.getBounds) {
                const bounds = selectedLayer.getBounds();
                const width = bounds.getEast() - bounds.getWest();
                const height = bounds.getNorth() - bounds.getSouth();
                info = `矩形 - 约 ${Math.round(width * 111000)}m × ${Math.round(height * 111000)}m`;
            } else if (selectedLayer.getLatLngs) {
                info = `多边形 - ${selectedLayer.getLatLngs()[0].length} 个顶点`;
            }
            selectionInfo.textContent = info;
            selectionInfo.style.display = 'block';
        } else {
            selectionInfo.style.display = 'none';
        }
    }
    
    // 更新实时信息显示
    updateRealtimeInfo();
}

function setupMapInteraction() {
    // 移除现有事件监听
    map.off('click mousemove mousedown mouseup');
    
    // 所有工具都支持选择功能
    setupSelectionEvents();
    
    if (currentTool === 'select') {
        // 选择工具只有选择功能
        map.dragging.enable();
    } else {
        // 创建工具在非创建状态下可以选择，点击工具时进入创建模式
        if (!isCreating) {
            map.dragging.enable();
        }
    }
}

// ========== 选择事件处理 ==========
function setupSelectionEvents() {
    map.on('click', function(e) {
        // 如果正在创建模式，不处理选择
        if (isCreating) {
            handleCreatingClick(e);
            return;
        }
        
        // 检查是否点击了控制手柄
        if (selectedLayer && isClickOnHandle(e.latlng)) {
            return; // 让控制手柄处理
        }
        
        // 检查是否点击了现有的图层
        let clickedLayer = findClickedLayer(e.latlng);
        
        if (clickedLayer) {
            if (selectedLayer === clickedLayer) {
                // 再次点击同一图层，取消选择
                clearSelection();
            } else {
                // 选择新图层
                selectLayer(clickedLayer);
            }
        } else {
            // 点击空白处
            if (currentTool === 'select') {
                // 选择工具：取消选择
                clearSelection();
            } else {
                // 创建工具：如果已有选中对象，先取消选择，然后进入创建模式
                if (selectedLayer) {
                    clearSelection();
                }
                // 进入创建模式并处理点击
                if (!isCreating) {
                    enterCreatingMode(currentTool);
                }
                handleCreatingClick(e);
            }
        }
    });
}

function findClickedLayer(latlng) {
    let clickedLayer = null;
    drawnItems.eachLayer(function(layer) {
        if (layer.getBounds) {
            if (layer.getBounds().contains(latlng)) {
                clickedLayer = layer;
            }
        } else if (layer.getLatLng) {
            const distance = layer.getLatLng().distanceTo(latlng);
            const threshold = layer.getRadius ? layer.getRadius() : 100;
            if (distance <= threshold) {
                clickedLayer = layer;
            }
        }
    });
    return clickedLayer;
}

function isClickOnHandle(latlng) {
    return controlHandles.some(handle => {
        return handle.getLatLng().distanceTo(latlng) < 50;
    });
}

// ========== 创建模式处理 ==========
function handleCreatingClick(e) {
    switch(currentTool) {
        case 'circle':
            createCircleArea(e.latlng);
            break;
        case 'rectangle':
            if (!document._rectStartPoint) {
                startRectangleCreation(e.latlng);
            } else {
                finishRectangleCreation(e.latlng);
            }
            break;
        case 'polygon':
            if (polygonPoints.length === 0) {
                startPolygonDrawing(e.latlng);
            } else {
                addPolygonPoint(e.latlng);
            }
            break;
    }
}

// ========== 快捷键系统 ==========
document.addEventListener('keydown', function(e) {
    // 忽略在输入框中的按键
    if (e.target.tagName === 'INPUT') return;
    
    switch(e.key.toLowerCase()) {
        case 'v':
            e.preventDefault();
            setTool('select');
            break;
        case 'c':
            e.preventDefault();
            setTool('circle');
            break;
        case 'r':
            e.preventDefault();
            setTool('rectangle');
            break;
        case 'p':
            e.preventDefault();
            setTool('polygon');
            break;
        case 'escape':
            e.preventDefault();
            if (isCreating) {
                cancelCreation();
            } else if (selectedLayer) {
                clearSelection();
            } else if (currentTool !== 'select') {
                setTool('select');
            }
            break;
        case 'enter':
            if (currentTool === 'polygon' && polygonPoints.length >= 3) {
                finishPolygonDrawing();
            }
            break;
        case 'delete':
        case 'backspace':
            if (selectedLayer) {
                e.preventDefault();
                deleteSelectedLayer();
            }
            break;
    }
});

function cancelCreation() {
    clearPreview();
    clearPolygonDrawing();
    document._rectStartPoint = null;
    
    // 清理矩形创建的事件监听
    map.off('mousemove', updateRectanglePreview);
    
    exitCreatingMode();
    setTool('select');
}

// ========== 圆形创建 ==========
function createCircleArea(center) {
    const radius = parseInt(document.getElementById('circle-radius').value) || 500;
    
    // 清除现有区域（只保留一个）
    drawnItems.clearLayers();
    clearSelection();
    clearPreview();
    
    // 创建新的圆形区域
    const circle = L.circle(center, {
        radius: radius,
        color: '#4e8cff',
        fillColor: '#4e8cff',
        fillOpacity: 0.1,
        weight: 3
    });
    
    drawnItems.addLayer(circle);
    
    // 完成创建，保持工具激活状态，选中新对象
    exitCreatingMode();
    selectLayer(circle);
    
    // 发送统计请求
    sendStatRequest({
        mode: 'point',
        lat: center.lat,
        lon: center.lng,
        radius: radius
    });
}

// ========== 矩形创建 ==========
function startRectangleCreation(point) {
    document._rectStartPoint = point;
    
    // 添加鼠标移动事件显示预览
    map.on('mousemove', updateRectanglePreview);
}

function updateRectanglePreview(e) {
    if (!document._rectStartPoint) return;
    
    clearPreview();
    
    const bounds = L.latLngBounds([document._rectStartPoint, e.latlng]);
    
    previewLayer = L.rectangle(bounds, {
        color: '#e67e22',
        fillColor: '#e67e22',
        fillOpacity: 0.2,
        weight: 2,
        dashArray: '5, 5'
    }).addTo(map);
}

function finishRectangleCreation(endPoint) {
    if (!document._rectStartPoint) return;
    
    const bounds = L.latLngBounds([document._rectStartPoint, endPoint]);
    
    // 清除现有区域
    drawnItems.clearLayers();
    clearSelection();
    clearPreview();
    map.off('mousemove', updateRectanglePreview);
    
    // 创建新的矩形区域
    const rectangle = L.rectangle(bounds, {
        color: '#4e8cff',
        fillColor: '#4e8cff',
        fillOpacity: 0.1,
        weight: 3
    });
    
    drawnItems.addLayer(rectangle);
    
    // 完成创建，保持工具激活状态，选中新对象
    document._rectStartPoint = null;
    exitCreatingMode();
    selectLayer(rectangle);
    
    // 发送统计请求
    sendStatRequest({
        mode: 'bbox',
        north: bounds.getNorth(),
        south: bounds.getSouth(),
        east: bounds.getEast(),
        west: bounds.getWest()
    });
}

// ========== 多边形创建 ==========
function startPolygonDrawing(point) {
    // 验证起始点有效性
    if (!point || isNaN(point.lat) || isNaN(point.lng)) {
        console.error('Invalid starting point for polygon:', point);
        return;
    }
    
    polygonPoints = [point];
    updatePolygonPreview();
    
    // 添加鼠标移动事件
    map.on('mousemove', updatePolygonPreviewLine);
}

function addPolygonPoint(point) {
    // 验证点有效性
    if (!point || isNaN(point.lat) || isNaN(point.lng)) {
        console.error('Invalid polygon point:', point);
        return;
    }
    
    polygonPoints.push(point);
    updatePolygonPreview();
}

function updatePolygonPreview() {
    clearPreview();
    
    if (polygonPoints.length < 2) return;
    
    // 验证点的有效性
    const validPoints = polygonPoints.filter(p => {
        return p && typeof p.lat === 'number' && typeof p.lng === 'number' && 
               !isNaN(p.lat) && !isNaN(p.lng) && 
               isFinite(p.lat) && isFinite(p.lng);
    });
    
    if (validPoints.length < 2) return;
    
    previewLayer = L.polygon(validPoints, {
        color: '#e67e22',
        fillColor: '#e67e22',
        fillOpacity: 0.2,
        weight: 2,
        dashArray: '5, 5'
    }).addTo(map);
}

function updatePolygonPreviewLine(e) {
    if (polygonPoints.length === 0) return;
    
    // 验证鼠标位置有效性
    if (!e.latlng || isNaN(e.latlng.lat) || isNaN(e.latlng.lng)) return;
    
    clearPreview();
    
    // 验证现有点的有效性
    const validPoints = polygonPoints.filter(p => {
        return p && typeof p.lat === 'number' && typeof p.lng === 'number' && 
               !isNaN(p.lat) && !isNaN(p.lng) && 
               isFinite(p.lat) && isFinite(p.lng);
    });
    
    if (validPoints.length === 0) return;
    
    // 显示当前多边形加上到鼠标位置的线
    const tempPoints = [...validPoints, e.latlng];
    
    previewLayer = L.polygon(tempPoints, {
        color: '#e67e22',
        fillColor: '#e67e22',
        fillOpacity: 0.2,
        weight: 2,
        dashArray: '5, 5'
    }).addTo(map);
}

function finishPolygonDrawing() {
    if (polygonPoints.length < 3) return;
    
    // 验证坐标点有效性并规范化
    const validPoints = polygonPoints.filter(p => {
        return p && typeof p.lat === 'number' && typeof p.lng === 'number' && 
               !isNaN(p.lat) && !isNaN(p.lng) && 
               isFinite(p.lat) && isFinite(p.lng) &&
               p.lat >= -90 && p.lat <= 90 && 
               p.lng >= -180 && p.lng <= 180;
    }).map(p => {
        // 确保坐标精度适中，避免过度精细导致的问题
        return L.latLng(
            Math.round(p.lat * 1000000) / 1000000,  // 6位小数精度
            Math.round(p.lng * 1000000) / 1000000
        );
    });
    
    if (validPoints.length < 3) {
        console.error('Invalid polygon points:', polygonPoints);
        alert('多边形坐标无效，请重新绘制');
        clearPolygonDrawing();
        exitCreatingMode();
        return;
    }
    
    // 清除现有区域
    drawnItems.clearLayers();
    clearSelection();
    clearPreview();
    map.off('mousemove', updatePolygonPreviewLine);
    
    try {
        // 创建新的多边形区域
        const polygon = L.polygon(validPoints, {
            color: '#4e8cff',
            fillColor: '#4e8cff',
            fillOpacity: 0.1,
            weight: 3
        });
        
        drawnItems.addLayer(polygon);
        
        // 完成创建，保持工具激活状态，选中新对象
        clearPolygonDrawing();
        exitCreatingMode();
        selectLayer(polygon);
        
        // 发送统计请求
        const coords = validPoints.map(p => [p.lat, p.lng]);
        sendStatRequest({
            mode: 'polygon',
            coordinates: coords
        });
        
    } catch (error) {
        console.error('Error creating polygon:', error);
        alert('创建多边形失败，请重新绘制');
        clearPolygonDrawing();
        exitCreatingMode();
    }
}

function clearPolygonDrawing() {
    polygonPoints = [];
    clearPreview();
    map.off('mousemove', updatePolygonPreviewLine);
}

// ========== 编辑控制手柄 ==========
function createEditHandles() {
    clearControlHandles();
    
    if (!selectedLayer) return;
    
    const bounds = getLayerBounds(selectedLayer);
    if (!bounds) return;
    
    const north = bounds.getNorth();
    const south = bounds.getSouth();
    const east = bounds.getEast();
    const west = bounds.getWest();
    
    // 四个角的缩放控制点
    const corners = [
        { pos: L.latLng(north, west), cursor: 'nw-resize', type: 'resize-nw' },
        { pos: L.latLng(north, east), cursor: 'ne-resize', type: 'resize-ne' },
        { pos: L.latLng(south, east), cursor: 'se-resize', type: 'resize-se' },
        { pos: L.latLng(south, west), cursor: 'sw-resize', type: 'resize-sw' }
    ];
    
    corners.forEach(corner => {
        const handle = createControlHandle(corner.pos, corner.type, '#27ae60', corner.cursor);
        controlHandles.push(handle);
        map.addLayer(handle);
    });
    
    // 创建选择区域覆盖层（用于平移和旋转检测）
    createSelectionOverlay(bounds);
}

function createControlHandle(latlng, type, color, cursor) {
    const handle = L.circleMarker(latlng, {
        radius: 6,
        fillColor: color,
        color: '#fff',
        weight: 2,
        opacity: 1,
        fillOpacity: 0.9,
        pane: 'markerPane',
        zIndexOffset: 1000
    });
    
    handle._handleType = type;
    handle._originalCursor = cursor;
    
    // 添加交互效果
    handle.on('mouseover', function() {
        this.setStyle({radius: 8, fillOpacity: 1});
        map.getContainer().style.cursor = cursor;
    });
    
    handle.on('mouseout', function() {
        this.setStyle({radius: 6, fillOpacity: 0.9});
        map.getContainer().style.cursor = '';
    });
    
    // 添加拖拽功能
    let isDragging = false;
    let startMousePos = null;
    let originalBounds = null;
    let originalCenter = null;
    
    handle.on('mousedown', function(e) {
        L.DomEvent.stop(e);
        isDragging = true;
        startMousePos = e.latlng;
        originalBounds = getLayerBounds(selectedLayer);
        originalCenter = originalBounds.getCenter();
        map.getContainer().style.cursor = cursor;
        
        // 禁用地图拖拽
        map.dragging.disable();
        
        // 添加全局拖拽事件
        map.on('mousemove', onHandleDrag);
        map.on('mouseup', onHandleDragEnd);
    });
    
    function onHandleDrag(e) {
        if (!isDragging) return;
        
        const currentMousePos = e.latlng;
        
        if (type.startsWith('resize-')) {
            resizeSelectedLayerByCorner(type, currentMousePos, originalBounds, originalCenter);
        }
        
        createEditHandles();
    }
    
    function onHandleDragEnd(e) {
        if (!isDragging) return;
        
        isDragging = false;
        map.getContainer().style.cursor = '';
        
        // 恢复地图拖拽
        map.dragging.enable();
        
        // 移除全局拖拽事件
        map.off('mousemove', onHandleDrag);
        map.off('mouseup', onHandleDragEnd);
        
        // 重新计算统计
        refreshCurrentArea();
        updateRealtimeInfo();
    }
    
    return handle;
}

// 创建选择区域覆盖层
function createSelectionOverlay(bounds) {
    // 创建一个透明的矩形覆盖层用于检测悬停和拖拽
    const overlay = L.rectangle(bounds, {
        fillColor: 'transparent',
        color: 'transparent',
        weight: 0,
        opacity: 0,
        fillOpacity: 0,
        pane: 'overlayPane',
        interactive: true
    });
    
    controlHandles.push(overlay);
    map.addLayer(overlay);
    
    let isDragging = false;
    let dragStartPos = null;
    let dragStartBounds = null;
    
    // 鼠标移动检测
    overlay.on('mousemove', function(e) {
        if (isDragging) return;
        
        const mousePos = e.latlng;
        const cursorType = getOverlayCursorType(mousePos, bounds);
        map.getContainer().style.cursor = cursorType;
    });
    
    overlay.on('mouseout', function() {
        if (!isDragging) {
            map.getContainer().style.cursor = '';
        }
    });
    
    // 拖拽处理
    overlay.on('mousedown', function(e) {
        L.DomEvent.stop(e);
        
        const mousePos = e.latlng;
        const cursorType = getOverlayCursorType(mousePos, bounds);
        
        isDragging = true;
        dragStartPos = mousePos;
        dragStartBounds = getLayerBounds(selectedLayer);
        map.getContainer().style.cursor = cursorType;
        
        // 禁用地图拖拽
        map.dragging.disable();
        
        // 添加全局事件
        map.on('mousemove', onOverlayDrag);
        map.on('mouseup', onOverlayDragEnd);
    });
    
    function onOverlayDrag(e) {
        if (!isDragging) return;
        
        const currentPos = e.latlng;
        const cursorType = map.getContainer().style.cursor;
        
        if (cursorType === 'move') {
            // 平移
            const deltaLat = currentPos.lat - dragStartPos.lat;
            const deltaLng = currentPos.lng - dragStartPos.lng;
            moveSelectedLayerAbsolute(deltaLat, deltaLng, dragStartBounds);
        } else if (cursorType === 'grab') {
            // 旋转
            rotateSelectedLayerFromEdge(currentPos, dragStartBounds.getCenter());
        }
        
        createEditHandles();
    }
    
    function onOverlayDragEnd(e) {
        if (!isDragging) return;
        
        isDragging = false;
        map.getContainer().style.cursor = '';
        
        // 恢复地图拖拽
        map.dragging.enable();
        
        // 移除全局事件
        map.off('mousemove', onOverlayDrag);
        map.off('mouseup', onOverlayDragEnd);
        
        // 重新计算统计
        refreshCurrentArea();
        updateRealtimeInfo();
    }
}

// 根据鼠标位置确定光标类型
function getOverlayCursorType(mousePos, bounds) {
    const north = bounds.getNorth();
    const south = bounds.getSouth();
    const east = bounds.getEast();
    const west = bounds.getWest();
    const centerLat = (north + south) / 2;
    const centerLng = (east + west) / 2;
    
    // 计算边界的扩展区域（用于旋转）
    const latExtent = (north - south) * 0.1; // 10%的扩展
    const lngExtent = (east - west) * 0.1;
    
    const extNorth = north + latExtent;
    const extSouth = south - latExtent;
    const extEast = east + lngExtent;
    const extWest = west - lngExtent;
    
    const lat = mousePos.lat;
    const lng = mousePos.lng;
    
    // 检查是否在扩展区域内但在原始区域外（旋转区域）
    const inExtended = lat >= extSouth && lat <= extNorth && lng >= extWest && lng <= extEast;
    const inOriginal = lat >= south && lat <= north && lng >= west && lng <= east;
    
    if (inExtended && !inOriginal) {
        return 'grab'; // 旋转
    } else if (inOriginal) {
        return 'move'; // 平移
    }
    
    return '';
}

// ========== 图层操作函数 ==========
// 绝对位置平移（基于原始位置+偏移量）
function moveSelectedLayerAbsolute(deltaLat, deltaLng, originalBounds) {
    if (!selectedLayer) return;
    
    if (selectedLayer.getLatLng && selectedLayer.setLatLng) {
        // 圆形
        const originalCenter = originalBounds.getCenter();
        const newLatLng = L.latLng(
            originalCenter.lat + deltaLat,
            originalCenter.lng + deltaLng
        );
        selectedLayer.setLatLng(newLatLng);
    } else if (selectedLayer.getLatLngs && selectedLayer.setLatLngs) {
        // 多边形或矩形 - 重新构建基于原始边界
        const originalNorth = originalBounds.getNorth();
        const originalSouth = originalBounds.getSouth();
        const originalEast = originalBounds.getEast();
        const originalWest = originalBounds.getWest();
        
        const newLatLngs = [
            [originalSouth + deltaLat, originalWest + deltaLng],
            [originalNorth + deltaLat, originalWest + deltaLng],
            [originalNorth + deltaLat, originalEast + deltaLng],
            [originalSouth + deltaLat, originalEast + deltaLng]
        ];
        selectedLayer.setLatLngs([newLatLngs]);
    }
}

// 通过角点缩放
function resizeSelectedLayerByCorner(cornerType, mousePos, originalBounds, originalCenter) {
    if (!selectedLayer) return;
    
    if (selectedLayer.getRadius && selectedLayer.setRadius) {
        // 圆形缩放 - 计算从中心到鼠标的距离
        const distance = originalCenter.distanceTo(mousePos);
        selectedLayer.setRadius(Math.max(10, distance));
    } else if (selectedLayer.getLatLngs && selectedLayer.setLatLngs) {
        // 矩形缩放
        const originalNorth = originalBounds.getNorth();
        const originalSouth = originalBounds.getSouth();
        const originalEast = originalBounds.getEast();
        const originalWest = originalBounds.getWest();
        
        let newNorth = originalNorth;
        let newSouth = originalSouth;
        let newEast = originalEast;
        let newWest = originalWest;
        
        // 根据拖拽的角点更新相应的边界
        switch(cornerType) {
            case 'resize-nw': // 左上角
                newNorth = mousePos.lat;
                newWest = mousePos.lng;
                break;
            case 'resize-ne': // 右上角
                newNorth = mousePos.lat;
                newEast = mousePos.lng;
                break;
            case 'resize-se': // 右下角
                newSouth = mousePos.lat;
                newEast = mousePos.lng;
                break;
            case 'resize-sw': // 左下角
                newSouth = mousePos.lat;
                newWest = mousePos.lng;
                break;
        }
        
        // 确保有效的边界（防止翻转）
        if (newNorth <= newSouth) {
            const temp = newNorth;
            newNorth = newSouth;
            newSouth = temp;
        }
        if (newEast <= newWest) {
            const temp = newEast;
            newEast = newWest;
            newWest = temp;
        }
        
        // 确保最小尺寸
        const minSize = 0.001;
        if (Math.abs(newNorth - newSouth) < minSize) return;
        if (Math.abs(newEast - newWest) < minSize) return;
        
        const newLatLngs = [
            [newSouth, newWest],
            [newNorth, newWest],
            [newNorth, newEast],
            [newSouth, newEast]
        ];
        selectedLayer.setLatLngs([newLatLngs]);
    }
}

// 从边缘旋转
function rotateSelectedLayerFromEdge(mousePos, center) {
    if (!selectedLayer || !selectedLayer.getLatLngs) return;
    
    // 计算旋转角度
    const angle = Math.atan2(mousePos.lng - center.lng, mousePos.lat - center.lat);
    
    // 获取原始点
    const originalLatLngs = selectedLayer.getLatLngs()[0];
    
    // 旋转每个点
    const rotatedLatLngs = originalLatLngs.map(latlng => {
        const deltaLat = latlng.lat - center.lat;
        const deltaLng = latlng.lng - center.lng;
        
        const rotatedLat = center.lat + deltaLat * Math.cos(angle) - deltaLng * Math.sin(angle);
        const rotatedLng = center.lng + deltaLat * Math.sin(angle) + deltaLng * Math.cos(angle);
        
        return L.latLng(rotatedLat, rotatedLng);
    });
    
    selectedLayer.setLatLngs([rotatedLatLngs]);
}

// ========== 选择管理 ==========
function selectLayer(layer) {
    clearSelection();
    selectedLayer = layer;
    
    // 高亮选中的图层
    if (layer.setStyle) {
        layer.setStyle({
            color: '#fe57a1',
            weight: 4,
            opacity: 1,
            dashArray: '10, 10'
        });
    }
    
    // 创建编辑控制手柄
    createEditHandles();
    
    // 添加实时tooltip
    addRealtimeTooltip(layer);
    
    updateStatusHint();
    updateSelectionInfo();
    updateRealtimeInfo();
}

function clearSelection() {
    if (selectedLayer) {
        // 恢复原始样式
        if (selectedLayer.setStyle) {
            selectedLayer.setStyle({
                color: '#4e8cff',
                weight: 3,
                opacity: 0.8,
                dashArray: null,
                fillOpacity: 0.1
            });
        }
        selectedLayer = null;
    }
    clearControlHandles();
    updateStatusHint();
    updateSelectionInfo();
    updateRealtimeInfo();
}

function deleteSelectedLayer() {
    if (selectedLayer) {
        drawnItems.removeLayer(selectedLayer);
        selectedLayer = null;
        clearControlHandles();
        
        // 清空统计结果
        document.getElementById('current-stats').style.display = 'none';
        document.getElementById('checkbox-group').style.display = 'none';
        document.getElementById('echarts-pie').innerHTML = '';
        document.getElementById('echarts-table').innerHTML = '';
        if (geojsonLayer) map.removeLayer(geojsonLayer);
        
        updateStatusHint();
        updateSelectionInfo();
        updateRealtimeInfo();
    }
}

// ========== 辅助函数 ==========
function clearPreview() {
    if (previewLayer) {
        map.removeLayer(previewLayer);
        previewLayer = null;
    }
}

function clearControlHandles() {
    controlHandles.forEach(handle => {
        map.removeLayer(handle);
    });
    controlHandles = [];
}

function getLayerBounds(layer) {
    if (layer.getBounds) {
        return layer.getBounds();
    } else if (layer.getLatLng && layer.getRadius) {
        // 圆形
        const center = layer.getLatLng();
        const radius = layer.getRadius();
        const latOffset = radius / 111000;
        const lngOffset = radius / (111000 * Math.cos(center.lat * Math.PI / 180));
        
        return L.latLngBounds([
            [center.lat - latOffset, center.lng - lngOffset],
            [center.lat + latOffset, center.lng + lngOffset]
        ]);
    }
    return null;
}

function refreshCurrentArea() {
    if (!lastRequestData) return;
    
    // 获取当前绘制的区域
    const layers = drawnItems.getLayers();
    if (layers.length === 0) return;
    
    const layer = layers[0]; // 假设只有一个区域
    
    if (layer.getLatLng && layer.getRadius) {
        // 圆形
        const center = layer.getLatLng();
        const radius = layer.getRadius();
        sendStatRequest({mode:'point', lat:center.lat, lon:center.lng, radius:radius});
    } else if (layer.getBounds) {
        // 矩形
        const bounds = layer.getBounds();
        sendStatRequest({mode:'bbox', north:bounds.getNorth(), south:bounds.getSouth(), east:bounds.getEast(), west:bounds.getWest()});
    } else if (layer.getLatLngs) {
        // 多边形
        const coords = layer.getLatLngs()[0].map(ll => [ll.lat, ll.lng]);
        sendStatRequest({mode:'polygon', coordinates:coords});
    }
}

// ========== 统计与可视化 ==========
function sendStatRequest(data) {
    lastRequestData = data;
    fetch('/api/stat', {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify(data)
    }).then(r=>r.json()).then(res=>{
        if (res.error) { alert(res.error); return; }
        
        currentData = res;
        originalGeoJSON = JSON.parse(res.geojson);
        
        createCheckboxes(res.road_types);
        updateDisplays();
        
        window._last_geojson = res.geojson;
    });
}

function createCheckboxes(road_types) {
    const checkboxList = document.getElementById('checkbox-list');
    const checkboxGroup = document.getElementById('checkbox-group');
    
    checkboxList.innerHTML = '';
    
    Object.keys(road_types).forEach(type => {
        const div = document.createElement('div');
        div.className = 'checkbox-item';
        
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = `cb-${type}`;
        checkbox.value = type;
        checkbox.checked = true;
        checkbox.onchange = updateDisplays;
        
        const label = document.createElement('label');
        label.htmlFor = `cb-${type}`;
        label.className = 'road-type-tooltip';
        label.innerHTML = `
            ${type}
            <span class="tooltip-text">${roadTypeDescriptions[type] || '未知道路类型'}</span>
        `;
        
        div.appendChild(checkbox);
        div.appendChild(label);
        checkboxList.appendChild(div);
    });
    
    checkboxGroup.style.display = 'block';
}

function getSelectedTypes() {
    const checkboxes = document.querySelectorAll('#checkbox-list input[type="checkbox"]:checked');
    return Array.from(checkboxes).map(cb => cb.value);
}

function filterDataBySelection(data) {
    const selectedTypes = getSelectedTypes();
    const filtered = {
        road_types: {},
        type_lengths: {},
        total_length: 0
    };
    
    selectedTypes.forEach(type => {
        if (data.road_types[type]) {
            filtered.road_types[type] = data.road_types[type];
            filtered.type_lengths[type] = data.type_lengths[type] || 0;
            filtered.total_length += filtered.type_lengths[type];
        }
    });
    
    return filtered;
}

function updateDisplays() {
    if (!currentData || !originalGeoJSON) return;
    
    const filteredData = filterDataBySelection(currentData);
    const selectedTypes = getSelectedTypes();
    
    updateMapDisplay(selectedTypes);
    updateCurrentStats(filteredData);
    showPie(filteredData.road_types, filteredData.type_lengths, filteredData.total_length);
    showTable(filteredData.road_types, filteredData.type_lengths, filteredData.total_length);
}

function updateMapDisplay(selectedTypes) {
    if (geojsonLayer) map.removeLayer(geojsonLayer);
    
    geojsonLayer = L.geoJSON(originalGeoJSON, {
        filter: function(feature) {
            return selectedTypes.includes(feature.properties.highway);
        },
        style: function(feature) {
            let color = getRoadColor(feature.properties.highway);
            return {color: color, weight: 3, opacity: 0.8};
        },
        onEachFeature: function(feature, layer) {
            let typeDesc = roadTypeDescriptions[feature.properties.highway] || feature.properties.highway;
            layer.bindPopup(`<b>类型:</b> ${feature.properties.highway}<br><b>说明:</b> ${typeDesc}<br><b>长度:</b> ${feature.properties.length.toFixed(1)}m`);
        }
    }).addTo(map);
}

function updateCurrentStats(data) {
    const currentStats = document.getElementById('current-stats');
    const currentContent = document.getElementById('current-content');
    
    if (!currentData) {
        currentStats.style.display = 'none';
        return;
    }
    
    let html = `
        <div class="stats-grid">
            <div class="stat-item">
                <div class="stat-label">道路类型</div>
                <div class="stat-value">${Object.keys(data.road_types).length}</div>
            </div>
            <div class="stat-item">
                <div class="stat-label">道路总数</div>
                <div class="stat-value">${Object.values(data.road_types).reduce((a,b) => a+b, 0)}</div>
            </div>
            <div class="stat-item" style="grid-column: 1 / -1;">
                <div class="stat-label">总长度</div>
                <div class="stat-value">${(data.total_length/1000).toFixed(2)} km</div>
            </div>
        </div>
    `;
    
    currentContent.innerHTML = html;
    currentStats.style.display = 'block';
}

function showPie(road_types, type_lengths, total_length) {
    let chart = echarts.init(document.getElementById('echarts-pie'), 'dark');
    let data = Object.entries(road_types).map(([k,v])=>({
        name: k,
        value: v,
        itemStyle: {
            color: getRoadColor(k)
        }
    }));
    
    chart.setOption({
        title: {text:'道路类型分布', left:'center', textStyle:{color:'#fff'}},
        tooltip: {
            trigger:'item',
            formatter: function(params) {
                const type = params.name;
                const desc = roadTypeDescriptions[type] || '未知道路类型';
                return `${type}<br/>${desc}<br/>数量: ${params.value} (${params.percent}%)`;
            }
        },
        legend: {
            bottom: 0, 
            textStyle: {color:'#fff'},
            formatter: function(name) {
                return name;
            }
        },
        series: [{
            type:'pie', 
            radius:'60%', 
            data,
            label: {
                color:'#fff', 
                formatter:'{b}: {c} ({d}%)'
            },
            emphasis: {
                itemStyle: {
                    shadowBlur: 10,
                    shadowOffsetX: 0,
                    shadowColor: 'rgba(0, 0, 0, 0.5)'
                }
            }
        }]
    });
}

function showTable(road_types, type_lengths, total_length) {
    let html = `<table><tr><th>类型</th><th>颜色</th><th>中文说明</th><th>数量</th><th>总长度(km)</th><th>百分比</th></tr>`;
    let total = Object.values(road_types).reduce((a,b)=>a+b,0);
    for (let k in road_types) {
        let count = road_types[k];
        let length = (type_lengths[k]||0)/1000;
        let percent = total ? (count/total*100).toFixed(1) : 0;
        let description = roadTypeDescriptions[k] || '未知道路类型';
        let color = getRoadColor(k);
        html += `<tr>
            <td>${k}</td>
            <td style="background-color:${color}; color:white; text-align:center;">●</td>
            <td style="text-align:left; max-width:200px; font-size:12px;">${description}</td>
            <td>${count}</td>
            <td>${length.toFixed(2)}</td>
            <td>${percent}%</td>
        </tr>`;
    }
    html += `</table>`;
    document.getElementById('echarts-table').innerHTML = html;
}

// ========== 按钮事件 ==========
document.getElementById('refresh-btn').onclick = function() {
    if (!lastRequestData) {
        alert('请先选择一个区域进行统计');
        return;
    }
    sendStatRequest(lastRequestData);
};

document.getElementById('export-btn').onclick = function() {
    if (!window._last_geojson) return alert('请先选区并统计');
    fetch('/api/export', {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({geojson:window._last_geojson})
    }).then(r=>r.blob()).then(blob=>{
        let url = URL.createObjectURL(blob);
        let a = document.createElement('a');
        a.href = url;
        a.download = 'roads.csv';
        a.click();
        URL.revokeObjectURL(url);
    });
};

// ========== 实时信息显示系统 ==========
function updateRealtimeInfo() {
    const realtimePanel = document.getElementById('map-overlay');
    const realtimeData = document.getElementById('overlay-data');
    const realtimeTitle = document.getElementById('overlay-title');
    
    // 清除之前的定时器
    if (realtimeUpdateTimer) {
        clearTimeout(realtimeUpdateTimer);
        realtimeUpdateTimer = null;
    }
    
    if (selectedLayer) {
        realtimePanel.style.display = 'block';
        
        let dataHtml = '';
        let title = '';
        
        if (selectedLayer.getRadius) {
            // 圆形区域
            title = '圆形区域 - 实时数据';
            const center = selectedLayer.getLatLng();
            const radius = selectedLayer.getRadius();
            const area = Math.PI * radius * radius; // 平方米
            const circumference = 2 * Math.PI * radius; // 周长
            
            dataHtml = `
                <div class="overlay-item">
                    <div class="overlay-label">半径</div>
                    <div class="overlay-value">${Math.round(radius)} 米</div>
                </div>
                <div class="overlay-item">
                    <div class="overlay-label">面积</div>
                    <div class="overlay-value">${(area / 1000000).toFixed(2)} km²</div>
                </div>
                <div class="overlay-item">
                    <div class="overlay-label">周长</div>
                    <div class="overlay-value">${(circumference / 1000).toFixed(2)} km</div>
                </div>
                <div class="overlay-item">
                    <div class="overlay-label">纬度</div>
                    <div class="overlay-value">${center.lat.toFixed(6)}</div>
                </div>
                <div class="overlay-item">
                    <div class="overlay-label">经度</div>
                    <div class="overlay-value">${center.lng.toFixed(6)}</div>
                </div>
            `;
            
        } else if (selectedLayer.getBounds) {
            // 矩形区域
            title = '矩形区域 - 实时数据';
            const bounds = selectedLayer.getBounds();
            const center = bounds.getCenter();
            const widthDeg = bounds.getEast() - bounds.getWest();
            const heightDeg = bounds.getNorth() - bounds.getSouth();
            const widthM = widthDeg * 111000 * Math.cos(center.lat * Math.PI / 180);
            const heightM = heightDeg * 111000;
            const area = widthM * heightM;
            const perimeter = 2 * (widthM + heightM);
            
            dataHtml = `
                <div class="overlay-item">
                    <div class="overlay-label">宽度</div>
                    <div class="overlay-value">${Math.round(widthM)} 米</div>
                </div>
                <div class="overlay-item">
                    <div class="overlay-label">高度</div>
                    <div class="overlay-value">${Math.round(heightM)} 米</div>
                </div>
                <div class="overlay-item">
                    <div class="overlay-label">面积</div>
                    <div class="overlay-value">${(area / 1000000).toFixed(2)} km²</div>
                </div>
                <div class="overlay-item">
                    <div class="overlay-label">周长</div>
                    <div class="overlay-value">${(perimeter / 1000).toFixed(2)} km</div>
                </div>
                <div class="overlay-item">
                    <div class="overlay-label">中心纬度</div>
                    <div class="overlay-value">${center.lat.toFixed(6)}</div>
                </div>
                <div class="overlay-item">
                    <div class="overlay-label">中心经度</div>
                    <div class="overlay-value">${center.lng.toFixed(6)}</div>
                </div>
            `;
            
        } else if (selectedLayer.getLatLngs) {
            // 多边形区域
            title = '多边形区域 - 实时数据';
            const latlngs = selectedLayer.getLatLngs()[0];
            const vertexCount = latlngs.length;
            
            // 计算面积（近似）
            let area = 0;
            for (let i = 0; i < vertexCount; i++) {
                const j = (i + 1) % vertexCount;
                area += latlngs[i].lng * latlngs[j].lat;
                area -= latlngs[j].lng * latlngs[i].lat;
            }
            area = Math.abs(area) / 2;
            area = area * 111000 * 111000; // 近似转换为平方米
            
            // 计算周长
            let perimeter = 0;
            for (let i = 0; i < vertexCount; i++) {
                const j = (i + 1) % vertexCount;
                const dist = latlngs[i].distanceTo(latlngs[j]);
                perimeter += dist;
            }
            
            // 计算中心点
            let centerLat = 0, centerLng = 0;
            for (let latlng of latlngs) {
                centerLat += latlng.lat;
                centerLng += latlng.lng;
            }
            centerLat /= vertexCount;
            centerLng /= vertexCount;
            
            // 生成顶点列表
            let verticesHtml = '';
            for (let i = 0; i < vertexCount; i++) {
                verticesHtml += `
                    <div class="vertex-item">
                        <span class="vertex-number">P${i + 1}:</span>
                        <span class="vertex-coords">${latlngs[i].lat.toFixed(6)}, ${latlngs[i].lng.toFixed(6)}</span>
                    </div>
                `;
            }
            
            dataHtml = `
                <div class="overlay-item">
                    <div class="overlay-label">顶点数</div>
                    <div class="overlay-value">${vertexCount} 个</div>
                </div>
                <div class="overlay-item">
                    <div class="overlay-label">面积</div>
                    <div class="overlay-value">${(area / 1000000).toFixed(2)} km²</div>
                </div>
                <div class="overlay-item">
                    <div class="overlay-label">周长</div>
                    <div class="overlay-value">${(perimeter / 1000).toFixed(2)} km</div>
                </div>
                <div class="overlay-item">
                    <div class="overlay-label">中心纬度</div>
                    <div class="overlay-value">${centerLat.toFixed(6)}</div>
                </div>
                <div class="overlay-item">
                    <div class="overlay-label">中心经度</div>
                    <div class="overlay-value">${centerLng.toFixed(6)}</div>
                </div>
            `;
        }
        
        realtimeTitle.textContent = title;
        realtimeData.innerHTML = dataHtml;
        
        // 添加更新动画
        realtimeData.classList.add('data-updating');
        setTimeout(() => {
            realtimeData.classList.remove('data-updating');
        }, 300);
        
    } else if (isCreating && previewLayer) {
        // 显示正在创建的图形的预览信息
        realtimePanel.style.display = 'block';
        showCreatingPreviewInfo();
        
    } else {
        realtimePanel.style.display = 'none';
    }
}

function showCreatingPreviewInfo() {
    const realtimeData = document.getElementById('overlay-data');
    const realtimeTitle = document.getElementById('overlay-title');
    
    if (currentTool === 'circle' && previewLayer && previewLayer.getRadius) {
        realtimeTitle.textContent = '圆形区域 - 创建预览';
        const center = previewLayer.getLatLng();
        const radius = previewLayer.getRadius();
        const area = Math.PI * radius * radius;
        
        realtimeData.innerHTML = `
            <div class="overlay-item">
                <div class="overlay-label">半径</div>
                <div class="overlay-value">${Math.round(radius)} 米</div>
            </div>
            <div class="overlay-item">
                <div class="overlay-label">面积</div>
                <div class="overlay-value">${(area / 1000000).toFixed(2)} km²</div>
            </div>
            <div class="overlay-item">
                <div class="overlay-label">纬度</div>
                <div class="overlay-value">${center.lat.toFixed(6)}</div>
            </div>
            <div class="overlay-item">
                <div class="overlay-label">经度</div>
                <div class="overlay-value">${center.lng.toFixed(6)}</div>
            </div>
        `;
    } else if (currentTool === 'rectangle' && previewLayer && previewLayer.getBounds) {
        realtimeTitle.textContent = '矩形区域 - 创建预览';
        const bounds = previewLayer.getBounds();
        const center = bounds.getCenter();
        const widthDeg = bounds.getEast() - bounds.getWest();
        const heightDeg = bounds.getNorth() - bounds.getSouth();
        const widthM = widthDeg * 111000 * Math.cos(center.lat * Math.PI / 180);
        const heightM = heightDeg * 111000;
        const area = widthM * heightM;
        
        realtimeData.innerHTML = `
            <div class="overlay-item">
                <div class="overlay-label">宽度</div>
                <div class="overlay-value">${Math.round(widthM)} 米</div>
            </div>
            <div class="overlay-item">
                <div class="overlay-label">高度</div>
                <div class="overlay-value">${Math.round(heightM)} 米</div>
            </div>
            <div class="overlay-item">
                <div class="overlay-label">面积</div>
                <div class="overlay-value">${(area / 1000000).toFixed(2)} km²</div>
            </div>
            <div class="overlay-item">
                <div class="overlay-label">纬度</div>
                <div class="overlay-value">${center.lat.toFixed(6)}</div>
            </div>
            <div class="overlay-item">
                <div class="overlay-label">经度</div>
                <div class="overlay-value">${center.lng.toFixed(6)}</div>
            </div>
        `;
    } else if (currentTool === 'polygon' && polygonPoints.length > 0) {
        realtimeTitle.textContent = '多边形区域 - 创建预览';
        const vertexCount = polygonPoints.length;
        
        let verticesHtml = '';
        for (let i = 0; i < vertexCount; i++) {
            verticesHtml += `
                <div class="vertex-item">
                    <span class="vertex-number">P${i + 1}:</span>
                    <span class="vertex-coords">${polygonPoints[i].lat.toFixed(6)}, ${polygonPoints[i].lng.toFixed(6)}</span>
                </div>
            `;
        }
        
        realtimeData.innerHTML = `
            <div class="overlay-item" style="grid-column: 1 / -1;">
                <div class="overlay-label">已添加顶点</div>
                <div class="overlay-value">${vertexCount} 个</div>
            </div>
        `;
    }
}

function addRealtimeTooltip(layer) {
    // 为图层添加实时更新的tooltip
    layer.on('mousemove', function(e) {
        updateTooltipContent(layer, e.latlng);
    });
    
    layer.on('mouseout', function() {
        if (layer._tooltip) {
            layer.closeTooltip();
        }
    });
}

function updateTooltipContent(layer, mousePos) {
    let content = '';
    
    if (layer.getRadius) {
        // 圆形
        const center = layer.getLatLng();
        const radius = layer.getRadius();
        const area = Math.PI * radius * radius;
        content = `
            <div style="font-size: 12px; line-height: 1.4;">
                <strong>🔵 圆形区域</strong><br>
                📏 半径: ${Math.round(radius)} 米<br>
                📐 面积: ${(area / 1000000).toFixed(2)} km²<br>
                📍 中心: ${center.lat.toFixed(4)}, ${center.lng.toFixed(4)}
            </div>
        `;
    } else if (layer.getBounds) {
        // 矩形
        const bounds = layer.getBounds();
        const center = bounds.getCenter();
        const widthDeg = bounds.getEast() - bounds.getWest();
        const heightDeg = bounds.getNorth() - bounds.getSouth();
        const widthM = widthDeg * 111000 * Math.cos(center.lat * Math.PI / 180);
        const heightM = heightDeg * 111000;
        const area = widthM * heightM;
        content = `
            <div style="font-size: 12px; line-height: 1.4;">
                <strong>🔲 矩形区域</strong><br>
                📏 尺寸: ${Math.round(widthM)} × ${Math.round(heightM)} 米<br>
                📐 面积: ${(area / 1000000).toFixed(2)} km²<br>
                📍 中心: ${center.lat.toFixed(4)}, ${center.lng.toFixed(4)}
            </div>
        `;
    } else if (layer.getLatLngs) {
        // 多边形
        const latlngs = layer.getLatLngs()[0];
        const vertexCount = latlngs.length;
        
        // 计算面积（近似）
        let area = 0;
        for (let i = 0; i < vertexCount; i++) {
            const j = (i + 1) % vertexCount;
            area += latlngs[i].lng * latlngs[j].lat;
            area -= latlngs[j].lng * latlngs[i].lat;
        }
        area = Math.abs(area) / 2 * 111000 * 111000;
        
        // 计算中心点
        let centerLat = 0, centerLng = 0;
        for (let latlng of latlngs) {
            centerLat += latlng.lat;
            centerLng += latlng.lng;
        }
        centerLat /= vertexCount;
        centerLng /= vertexCount;
        
        content = `
            <div style="font-size: 12px; line-height: 1.4;">
                <strong>🔶 多边形区域</strong><br>
                📏 顶点: ${vertexCount} 个<br>
                📐 面积: ${(area / 1000000).toFixed(2)} km²<br>
                📍 中心: ${centerLat.toFixed(4)}, ${centerLng.toFixed(4)}
            </div>
        `;
    }
    
    if (content) {
        layer.bindTooltip(content, {
            permanent: false,
            direction: 'top',
            offset: [0, -20],
            className: 'realtime-tooltip'
        }).openTooltip(mousePos);
    }
}

function startRealtimeUpdates() {
    // 开始定时更新实时信息（当用户正在编辑时）
    if (realtimeUpdateTimer) {
        clearInterval(realtimeUpdateTimer);
    }
    
    realtimeUpdateTimer = setInterval(() => {
        if (selectedLayer || (isCreating && previewLayer) || (currentTool === 'polygon' && polygonPoints.length > 0)) {
            updateRealtimeInfo();
            
            // 同时更新tooltip内容（如果存在的话）
            if (selectedLayer && selectedLayer._tooltip) {
                updateTooltipContent(selectedLayer, selectedLayer.getLatLng ? selectedLayer.getLatLng() : selectedLayer.getBounds().getCenter());
            }
        }
    }, 100); // 每100ms更新一次
}

// ========== 面板拖拽调整功能 ==========
function initResizePanel() {
    const leftPanel = document.getElementById('left-panel');
    const resizeHandle = document.getElementById('resize-handle');
    const mainContainer = document.querySelector('.main-container');
    
    let isResizing = false;
    let startX = 0;
    let startWidth = 0;
    
    // 从localStorage加载保存的宽度
    const savedWidth = localStorage.getItem('left-panel-width');
    if (savedWidth && savedWidth >= 250 && savedWidth <= 600) {
        leftPanel.style.width = savedWidth + 'px';
    }
    
    resizeHandle.addEventListener('mousedown', function(e) {
        isResizing = true;
        startX = e.clientX;
        startWidth = parseInt(document.defaultView.getComputedStyle(leftPanel).width, 10);
        
        resizeHandle.classList.add('dragging');
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
        
        e.preventDefault();
    });
    
    document.addEventListener('mousemove', function(e) {
        if (!isResizing) return;
        
        const deltaX = e.clientX - startX;
        const newWidth = startWidth + deltaX;
        
        // 限制最小和最大宽度
        const minWidth = 250;
        const maxWidth = Math.min(600, window.innerWidth * 0.6); // 最大60%屏幕宽度
        
        if (newWidth >= minWidth && newWidth <= maxWidth) {
            leftPanel.style.width = newWidth + 'px';
            
            // 触发地图重新调整大小
            setTimeout(() => {
                if (map) {
                    map.invalidateSize();
                }
            }, 100);
        }
    });
    
    document.addEventListener('mouseup', function() {
        if (isResizing) {
            isResizing = false;
            resizeHandle.classList.remove('dragging');
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
            
            // 保存宽度到localStorage
            const currentWidth = parseInt(document.defaultView.getComputedStyle(leftPanel).width, 10);
            localStorage.setItem('left-panel-width', currentWidth);
            
            // 触发地图重新调整大小
            setTimeout(() => {
                if (map) {
                    map.invalidateSize();
                }
            }, 100);
        }
    });
    
    // 窗口大小改变时重新计算
    window.addEventListener('resize', function() {
        const currentWidth = parseInt(document.defaultView.getComputedStyle(leftPanel).width, 10);
        const maxWidth = Math.min(600, window.innerWidth * 0.6);
        
        if (currentWidth > maxWidth) {
            leftPanel.style.width = maxWidth + 'px';
            localStorage.setItem('left-panel-width', maxWidth);
        }
        
        setTimeout(() => {
            if (map) {
                map.invalidateSize();
            }
        }, 100);
    });
}

// ========== 初始化 ==========
setTool('select');
startRealtimeUpdates();
initResizePanel(); 