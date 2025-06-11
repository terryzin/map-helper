# 道路统计分析工具 / Road Helper Map Tool

一个基于OpenStreetMap数据的道路统计分析工具，支持多种查询方式和数据可视化。

A road statistical analysis tool based on OpenStreetMap data, supporting multiple query methods and data visualization.

## 功能特点

- 🗺️ 基于OpenStreetMap数据分析道路网络
- 📍 支持多种查询方式：坐标+半径、矩形范围、多边形区域
- 📊 提供详细的道路统计数据和可视化图表
- 🌐 Web界面，支持本地和网络访问
- 💾 数据导出功能（CSV格式）
- ⚡ 智能缓存系统，提升查询速度

## 安装与运行

### 方式一：源码运行

1. **安装依赖**
   ```bash
   pip install -r requirements.txt
   ```

2. **运行程序**
   ```bash
   # 直接运行Flask应用
   python app.py
   
   # 或使用客户端启动器（推荐）
   python client.py
   
   # 或使用启动脚本
   # Windows:
   start.bat
   
   # Linux/macOS:
   ./start.sh
   ```

3. **访问应用**
   - 本地访问：http://localhost:5000
   - 网络访问：http://[你的IP地址]:5000

### 方式二：打包为可执行文件

1. **安装打包依赖**
   ```bash
   pip install pyinstaller
   ```

2. **执行打包**
   ```bash
   # Windows:
   build.bat
   
   # Linux/macOS:
   ./build.sh
   ```

3. **运行打包后的程序**
   ```bash
   # 打包完成后，运行：
   ./dist/道路统计分析工具.exe  # Windows
   ./dist/道路统计分析工具     # Linux/macOS
   ```

## 使用说明

### 查询方式

1. **坐标+半径查询**
   - 输入纬度、经度坐标
   - 设置查询半径（米）
   - 点击"开始分析"

2. **矩形范围查询**
   - 在地图上使用矩形工具绘制区域
   - 或手动输入北、南、东、西边界坐标

3. **多边形区域查询**
   - 使用多边形工具在地图上绘制任意形状区域
   - 支持复杂的不规则区域分析

### 结果展示

- **统计表格**：显示各类道路的数量和总长度
- **饼图**：道路类型分布比例
- **柱状图**：各类道路长度对比
- **地图显示**：在地图上可视化道路网络
- **数据导出**：将结果导出为CSV文件

### 道路类型说明

- **主干道(trunk)**：城市主要干道
- **高速公路(motorway)**：封闭式高速公路
- **次干道(primary)**：重要的城市道路
- **支路(secondary)**：连接主要道路的次要道路
- **三级道路(tertiary)**：当地重要道路
- **居住区道路(residential)**：住宅区内道路
- **未分类道路(unclassified)**：其他类型道路

## 项目结构

```
road-helper/
├── app.py              # Flask Web应用
├── client.py           # 客户端启动器
├── requirements.txt    # Python依赖包
├── config.json        # 用户配置文件
├── build.spec         # PyInstaller配置
├── build.bat          # Windows打包脚本
├── build.sh           # Linux/macOS打包脚本
├── start.bat          # Windows启动脚本
├── start.sh           # Linux/macOS启动脚本
├── templates/         # HTML模板
│   └── index.html
├── static/           # 静态资源
│   ├── css/
│   ├── js/
│   └── libs/
└── cache/           # OSM数据缓存
```

## 技术栈

- **后端**：Flask, OSMnx, GeoPandas, Pandas
- **前端**：HTML5, CSS3, JavaScript, Leaflet, ECharts
- **数据源**：OpenStreetMap
- **打包**：PyInstaller

## 注意事项

1. **网络连接**：首次查询需要从OpenStreetMap下载数据
2. **缓存机制**：查询结果会自动缓存，提升后续查询速度
3. **内存使用**：大范围查询可能消耗较多内存
4. **防火墙**：确保防火墙允许访问指定端口

## 许可证

MIT License

## 贡献

欢迎提交Issues和Pull Requests来改进这个项目。
