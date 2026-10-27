"""
Build Comprehensive AISSMS Campus Directions & Photographic Master Guide PDF
Includes all uploaded real photos, aerial drone layouts, spatial directions,
YouTube tour references, building zones, and navigation pathways.
"""

import os
from pathlib import Path
from PIL import Image as PILImage
from reportlab.lib.pagesizes import letter, landscape
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image as RLImage, KeepTogether, PageBreak, HRFlowable
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle

def create_campus_guide_pdf():
    pdf_path = r"D:\tryal\CampusSmartQueue\AISSMS_Campus_Directions_and_Image_Guide.pdf"
    doc = SimpleDocTemplate(
        pdf_path,
        pagesize=landscape(letter),
        leftMargin=36,
        rightMargin=36,
        topMargin=32,
        bottomMargin=32
    )

    styles = getSampleStyleSheet()

    # Custom styles
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=24,
        leading=28,
        textColor=colors.HexColor('#0f172a'),
        alignment=0,
        spaceAfter=4
    )

    subtitle_style = ParagraphStyle(
        'DocSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=11,
        leading=15,
        textColor=colors.HexColor('#ea580c'),
        spaceAfter=12
    )

    h2_style = ParagraphStyle(
        'SectionH2',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=15,
        leading=18,
        textColor=colors.HexColor('#1e293b'),
        spaceBefore=10,
        spaceAfter=6
    )

    body_style = ParagraphStyle(
        'BodyDark',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9.5,
        leading=13.5,
        textColor=colors.HexColor('#334155'),
        spaceAfter=6
    )

    caption_style = ParagraphStyle(
        'ImgCaption',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8.5,
        leading=11.5,
        textColor=colors.HexColor('#0f172a'),
        alignment=1
    )

    caption_sub = ParagraphStyle(
        'ImgCaptionSub',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=7.5,
        leading=10,
        textColor=colors.HexColor('#64748b'),
        alignment=1
    )

    meta_badge = ParagraphStyle(
        'MetaBadge',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8,
        leading=10,
        textColor=colors.HexColor('#0284c7')
    )

    story = []

    # Uploaded image paths
    base_dir = r"C:\Users\kaifs\.gemini\antigravity\brain\531df0bf-8bdf-4fa2-b78a-1f1ade32f03c\.user_uploaded"
    img_files = {
        "master_drone": os.path.join(base_dir, "media_1792404381610_1fb614ac.jpg"),
        "front_drone": os.path.join(base_dir, "media_1792403758919_e0f6ab1a.png"),
        "statue_ioit": os.path.join(base_dir, "media_1792403774584_63a80ac1.png"),
        "coe_ground": os.path.join(base_dir, "media_1792403504685_911930c7.png"),
        "balcony_quad": os.path.join(base_dir, "media_1792403514871_48f0324d.png"),
        "jet_close": os.path.join(base_dir, "media_1792403537573_3d6091cf.png"),
        "pharmacy_front": os.path.join(base_dir, "media_1792403548851_56ffb8de.png"),
        "pharmacy_angle": os.path.join(base_dir, "media_1792403808795_2ff71629.png"),
        "coe_portal": os.path.join(base_dir, "media_1792403527656_3c46f517.png"),
        "institutes_web": os.path.join(base_dir, "media_1792403938387_2cddc7b8.png"),
    }

    # =========================================================================
    # PAGE 1: TITLE & MASTER PANORAMA OVERVIEW
    # =========================================================================
    header_data = [
        [
            Paragraph("<b>AISSMS PUNE CAMPUS: ARCHITECTURAL & SPATIAL GUIDE</b>", title_style),
            Paragraph("<b>CAMPUS SMARTQUEUE 2.0</b><br/><font color='#64748b'>All India Shri Shivaji Memorial Society</font>", ParagraphStyle('HRight', parent=styles['Normal'], alignment=2, fontSize=9, leading=12))
        ]
    ]
    t_head = Table(header_data, colWidths=[520, 200])
    t_head.setStyle(TableStyle([('VALIGN', (0,0), (-1,-1), 'TOP')]))
    story.append(t_head)
    story.append(Paragraph("Comprehensive Visual Directory, Building Layout, Navigation Directions & Landmark Analysis | Ref: YouTube Tour Mh7octCp7kg", subtitle_style))
    story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor('#ea580c'), spaceAfter=10))

    # Master Drone Hero Image
    if os.path.exists(img_files["master_drone"]):
        story.append(RLImage(img_files["master_drone"], width=720, height=310))
    story.append(Spacer(1, 4))
    story.append(Paragraph("<b>Figure 1.0: Master Campus Aerial Drone Panorama (Bird's Eye Perspective Looking East/South-East)</b>", caption_style))
    story.append(Paragraph("Left: Institute of Management (IOM) & Sawtooth Workshops | Center: College of Engineering (COE) & IAF Fighter Jet Monument | Right: Shivaji Maharaj Statue Plaza & IOIT High-Rise Tower", caption_sub))
    story.append(Spacer(1, 10))

    # Summary box
    summary_text = """
    <b>Campus Overview & Location:</b> The historic AISSMS campus is centrally situated at Kennedy Road, Near RTO, Pune (411001), adjacent to the Mula-Mutha riverbed.
    The campus houses 6 premier educational institutions across an integrated academic complex centered around two expansive landscaped green quads,
    interconnected by tree-lined pedestrian ring roads and high-footfall facility hubs.
    """
    t_sum = Table([[Paragraph(summary_text, body_style)]], colWidths=[720])
    t_sum.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#f8fafc')),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#cbd5e1')),
        ('PADDING', (0,0), (-1,-1), 8),
    ]))
    story.append(t_sum)

    story.append(PageBreak())

    # =========================================================================
    # PAGE 2: CAMPUS ZONES, QUADRANGLES & SPATIAL DIRECTIONS
    # =========================================================================
    story.append(Paragraph("1. Master Spatial Directions & Campus Quadrangles", h2_style))
    story.append(Paragraph("The campus layout follows an intuitive cardinal orientation structured around two primary open-air green spaces:", body_style))

    # Two column layout: Front Drone + Balcony Quad
    col_w = 352
    row1 = [
        [
            RLImage(img_files["front_drone"], width=col_w, height=170),
            RLImage(img_files["balcony_quad"], width=col_w, height=170)
        ],
        [
            Paragraph("<b>Figure 2.1: Front Orthographic Drone View (COE Axis)</b>", caption_style),
            Paragraph("<b>Figure 2.2: Balcony View Over Central Engineering Quad</b>", caption_style)
        ],
        [
            Paragraph("Direct frontal alignment: IOM (Left), Main Quad (Center), Jet Plaza, COE Entrance Arch", caption_sub),
            Paragraph("Pedestrian ring pathways connecting Central Canteen, Academic Wings, and Library corridor", caption_sub)
        ]
    ]
    t_quads = Table(row1, colWidths=[col_w + 8, col_w + 8])
    t_quads.setStyle(TableStyle([
        ('ALIGN', (0,0), (-1,-1), 'CENTER'),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 2),
    ]))
    story.append(t_quads)
    story.append(Spacer(1, 6))

    # Direction breakdown table
    dir_table_data = [
        [
            Paragraph("<b>Campus Zone</b>", meta_badge),
            Paragraph("<b>Key Buildings & Landmark Features</b>", meta_badge),
            Paragraph("<b>Key Access Directions & Footfall Flow</b>", meta_badge)
        ],
        [
            Paragraph("<b>North Zone (Main Frontage)</b>", body_style),
            Paragraph("• AISSMS College of Engineering (Main 4-Story Academic Wing)<br/>• Heritage Jet Monument & Concrete Bridge Pedestal<br/>• Central Administrative Offices & Admission Hall", body_style),
            Paragraph("Primary entry from main RTO / Kennedy Road. Direct access to Admission Office, Student Section counters, and Principal's secretariat.", body_style)
        ],
        [
            Paragraph("<b>West Zone (Management & Labs)</b>", body_style),
            Paragraph("• AISSMS Institute of Management (IOM)<br/>• Central Mechanical Engineering Workshops (Sawtooth Roofs)<br/>• Industrial Training Institute (ITI) Technical Labs", body_style),
            Paragraph("Flanks the western perimeter. High footfall during morning practical batch turnovers (09:00 - 11:30 AM).", body_style)
        ],
        [
            Paragraph("<b>South-East Zone (IT & Computing)</b>", body_style),
            Paragraph("• AISSMS Institute of Information Technology (IOIT 8+ Story Tower)<br/>• Chhatrapati Shivaji Maharaj Statue Memorial & Flower Garden<br/>• Department of AI&DS, Computer Engg, and Modern Seminar Auditoriums", body_style),
            Paragraph("Connects directly through the central statue plaza avenue. Students flow between COE and IOIT for joint symposiums and interdisciplinary labs.", body_style)
        ],
        [
            Paragraph("<b>Central Spine (Student Life)</b>", body_style),
            Paragraph("• Central Canteen & Open Pergola Court<br/>• Reprographic & Xerox Counter Hub<br/>• Dr. B. D. Patil Central Library & Reading Halls", body_style),
            Paragraph("Heart of student mobility. Peak lunch surge between 12:30 PM - 01:30 PM. Focus of SmartQueue real-time queue monitors.", body_style)
        ]
    ]
    t_dir = Table(dir_table_data, colWidths=[150, 270, 300])
    t_dir.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#f1f5f9')),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#cbd5e1')),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor('#e2e8f0')),
        ('PADDING', (0,0), (-1,-1), 4),
        ('VALIGN', (0,0), (-1,-1), 'TOP')
    ]))
    story.append(t_dir)

    story.append(PageBreak())

    # =========================================================================
    # PAGE 3: ICONIC LANDMARKS - FIGHTER JET MEMORIAL & STATUE PLAZA
    # =========================================================================
    story.append(Paragraph("2. Iconic Campus Landmarks: IAF Fighter Jet & Shivaji Maharaj Statue", h2_style))
    story.append(Paragraph("Two monumental installations define the campus identity and act as central meeting waypoints for thousands of engineering students:", body_style))

    row2 = [
        [
            RLImage(img_files["jet_close"], width=col_w, height=195),
            RLImage(img_files["statue_ioit"], width=col_w, height=195)
        ],
        [
            Paragraph("<b>Figure 3.1: Indian Air Force Fighter Jet Memorial</b>", caption_style),
            Paragraph("<b>Figure 3.2: Chhatrapati Shivaji Maharaj Statue Memorial</b>", caption_style)
        ],
        [
            Paragraph("Authentic IAF aircraft on concrete bridge pedestal facing the COE lawn plaza", caption_sub),
            Paragraph("Heroic bronze statue set against memorial wall facing the IOIT curved pavilion", caption_sub)
        ]
    ]
    t_land = Table(row2, colWidths=[col_w + 8, col_w + 8])
    t_land.setStyle(TableStyle([
        ('ALIGN', (0,0), (-1,-1), 'CENTER'),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 3),
    ]))
    story.append(t_land)
    story.append(Spacer(1, 10))

    # Landmark details
    lm_data = [
        [
            Paragraph("<b>Landmark Details & Engineering Significance</b>", meta_badge),
            Paragraph("<b>Role in Campus SmartQueue Navigation</b>", meta_badge)
        ],
        [
            Paragraph("<b>1. IAF Fighter Jet Pedestal Monument:</b><br/>"
                      "A signature hallmark of AISSMS College of Engineering. The decommissioned military jet sits elevated on a four-pillar structural platform right in front of the main building portal. It pays homage to Indian aerospace engineering and defense services, visible from across the main lawn.", body_style),
            Paragraph("<b>Waypoint A (North Quad):</b> The primary geographic reference point for students visiting Admission Counters, Exam Section, and Reprographics. "
                      "Students wait around the pergola garden adjacent to the jet while tracking their virtual token call time.", body_style)
        ],
        [
            Paragraph("<b>2. Chhatrapati Shivaji Maharaj Memorial Plaza:</b><br/>"
                      "Located adjacent to the IOIT wing. Features a majestic bronze statue of Chhatrapati Shivaji Maharaj mounted on an elevated black granite pedestal, framed by a curved acoustic stone wall, manicured flower beds, and period ornamental streetlamps.", body_style),
            Paragraph("<b>Waypoint B (South Quad):</b> The central landmark separating COE from IOIT. Houses the secondary pedestrian transit artery where footfall splits towards the Department of AI&DS, Computer Labs, and Pharmacy.", body_style)
        ]
    ]
    t_lm = Table(lm_data, colWidths=[360, 360])
    t_lm.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#f1f5f9')),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#cbd5e1')),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor('#e2e8f0')),
        ('PADDING', (0,0), (-1,-1), 8),
        ('VALIGN', (0,0), (-1,-1), 'TOP')
    ]))
    story.append(t_lm)

    story.append(PageBreak())

    # =========================================================================
    # PAGE 4: BUILDING DIRECTORY - COE MAIN BLOCK & COLLEGE OF PHARMACY
    # =========================================================================
    story.append(Paragraph("3. Building Profiles: College of Engineering & College of Pharmacy", h2_style))
    story.append(Paragraph("Architectural details and directional access for the primary engineering and pharmacy facilities:", body_style))

    row3 = [
        [
            RLImage(img_files["coe_ground"], width=col_w, height=195),
            RLImage(img_files["pharmacy_front"], width=col_w, height=195)
        ],
        [
            Paragraph("<b>Figure 4.1: AISSMS College of Engineering (COE) Main Facade</b>", caption_style),
            Paragraph("<b>Figure 4.2: AISSMS College of Pharmacy Facade</b>", caption_style)
        ],
        [
            Paragraph("Lush front lawn with active sprinklers, red portal arch, and rooftop neon identity", caption_sub),
            Paragraph("Signature stepped facade with peach cylindrical bay window and basement ramp", caption_sub)
        ]
    ]
    t_bld = Table(row3, colWidths=[col_w + 8, col_w + 8])
    t_bld.setStyle(TableStyle([
        ('ALIGN', (0,0), (-1,-1), 'CENTER'),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 3),
    ]))
    story.append(t_bld)
    story.append(Spacer(1, 10))

    bld_data = [
        [
            Paragraph("<b>Feature</b>", meta_badge),
            Paragraph("<b>AISSMS College of Engineering (COE - EN6278)</b>", meta_badge),
            Paragraph("<b>AISSMS College of Pharmacy</b>", meta_badge)
        ],
        [
            Paragraph("<b>Architecture</b>", body_style),
            Paragraph("Modern 4-story educational block with prominent red structural columns, sunshade fins, central entrance portal, and rooftop neon sign.", body_style),
            Paragraph("Stepped contemporary building with peach circular bay projection, white column grid, and ramped subterranean parking level.", body_style)
        ],
        [
            Paragraph("<b>Key Departments</b>", body_style),
            Paragraph("• AI & Data Science (AI&DS)<br/>• Computer Engineering<br/>• Mechanical Engineering<br/>• Civil & Environmental Engineering<br/>• Electronics & Telecommunication (E&TC)", body_style),
            Paragraph("• Pharmaceutics Laboratories<br/>• Pharmaceutical Chemistry<br/>• Pharmacology Research Suites<br/>• Pharmacognosy Herbarium", body_style)
        ],
        [
            Paragraph("<b>Service Counters</b>", body_style),
            Paragraph("Ground Floor: Central Admission Counter (Desk 1-3), Student Section (Desk 1-4), Exam Cell, Cashier Counter, Scholarship Verification.", body_style),
            Paragraph("Administrative reception, student documentation desk, and departmental dispensary store.", body_style)
        ]
    ]
    t_bld_info = Table(bld_data, colWidths=[120, 310, 290])
    t_bld_info.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#f1f5f9')),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#cbd5e1')),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor('#e2e8f0')),
        ('PADDING', (0,0), (-1,-1), 6),
        ('VALIGN', (0,0), (-1,-1), 'TOP')
    ]))
    story.append(t_bld_info)

    story.append(PageBreak())

    # =========================================================================
    # PAGE 5: COMPLETE 6-INSTITUTE MASTER DIRECTORY & DIRECTIONS
    # =========================================================================
    story.append(Paragraph("4. All-India Shri Shivaji Memorial Society: Complete 6-Institute Directory", h2_style))
    story.append(Paragraph("Master campus ecosystem as documented on the official portal and campus video tour:", body_style))

    row4 = [
        [
            RLImage(img_files["institutes_web"], width=420, height=210),
            RLImage(img_files["pharmacy_angle"], width=290, height=210)
        ],
        [
            Paragraph("<b>Figure 5.1: Official AISSMS Society 6-Institutes Grid (Ref: aissms.org)</b>", caption_style),
            Paragraph("<b>Figure 5.2: Pharmacy Wing & Quad Promenade</b>", caption_style)
        ],
        [
            Paragraph("COE, IOIT, IOM, Polytechnic, Hotel Management (HMCT), and ITI", caption_sub),
            Paragraph("Promenade pathway connecting south quadrangle to central canteen", caption_sub)
        ]
    ]
    t_inst = Table(row4, colWidths=[430, 290])
    t_inst.setStyle(TableStyle([
        ('ALIGN', (0,0), (-1,-1), 'CENTER'),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 3),
    ]))
    story.append(t_inst)
    story.append(Spacer(1, 10))

    inst_table_data = [
        [
            Paragraph("<b>#</b>", meta_badge),
            Paragraph("<b>Institute Name</b>", meta_badge),
            Paragraph("<b>Established</b>", meta_badge),
            Paragraph("<b>Campus Location / Direction</b>", meta_badge),
            Paragraph("<b>SmartQueue Monitored Counters</b>", meta_badge)
        ],
        [
            Paragraph("1", body_style),
            Paragraph("<b>AISSMS College of Engineering (COE)</b>", body_style),
            Paragraph("1992", body_style),
            Paragraph("North Courtyard, Facing Main Lawn & Jet Monument", body_style),
            Paragraph("Admission Office, Student Section, Xerox, Library", body_style)
        ],
        [
            Paragraph("2", body_style),
            Paragraph("<b>AISSMS Institute of Information Tech (IOIT)</b>", body_style),
            Paragraph("1999", body_style),
            Paragraph("South-East Wing, Adjacent to Shivaji Maharaj Statue", body_style),
            Paragraph("IT Exam Cell, Digital Lab Reservations", body_style)
        ],
        [
            Paragraph("3", body_style),
            Paragraph("<b>AISSMS Institute of Management (IOM)</b>", body_style),
            Paragraph("2002", body_style),
            Paragraph("West Perimeter, North of Workshop Sheds", body_style),
            Paragraph("MBA Section & Executive Seminar Counter", body_style)
        ],
        [
            Paragraph("4", body_style),
            Paragraph("<b>AISSMS Polytechnic</b>", body_style),
            Paragraph("1994", body_style),
            Paragraph("North-West Block, Rooftop Signage Facing Quad", body_style),
            Paragraph("Diploma Verification & Workshop Stores", body_style)
        ],
        [
            Paragraph("5", body_style),
            Paragraph("<b>AISSMS College of Hotel Mgmt & Catering (HMCT)</b>", body_style),
            Paragraph("1997", body_style),
            Paragraph("South Wing (Heritage Building Architecture)", body_style),
            Paragraph("Hospitality Training Center & Dining Halls", body_style)
        ],
        [
            Paragraph("6", body_style),
            Paragraph("<b>AISSMS Industrial Training Institute (ITI)</b>", body_style),
            Paragraph("1933", body_style),
            Paragraph("Western Workshop Complex (Gable / Sawtooth Roofs)", body_style),
            Paragraph("Technical Trade Verification & Tool Dispensary", body_style)
        ]
    ]
    t_tbl = Table(inst_table_data, colWidths=[24, 210, 60, 230, 196])
    t_tbl.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#f1f5f9')),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#cbd5e1')),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor('#e2e8f0')),
        ('PADDING', (0,0), (-1,-1), 5),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE')
    ]))
    story.append(t_tbl)

    story.append(PageBreak())

    # =========================================================================
    # PAGE 6: CAMPUS SMARTQUEUE 2.0 NAVIGATION & 3D INTEGRATION
    # =========================================================================
    story.append(Paragraph("5. Campus Navigation, Footfall Patterns & 3D Digital Twin Integration", h2_style))
    story.append(Paragraph("How the physical campus layout is modeled in the 3D Web Application and monitored by Campus SmartQueue 2.0:", body_style))

    row5 = [
        [
            RLImage(img_files["coe_portal"], width=col_w, height=195),
            RLImage(img_files["master_drone"], width=col_w, height=195)
        ],
        [
            Paragraph("<b>Figure 6.1: Main Engineering Portal & Entrance Plaza</b>", caption_style),
            Paragraph("<b>Figure 6.2: Master 3D Spatial Calibration Reference</b>", caption_style)
        ],
        [
            Paragraph("Ground zero for student entry: Direct corridor to Student Section and Cashier", caption_sub),
            Paragraph("Calibrated in Three.js (campus3d.js) with accurate building coordinates", caption_sub)
        ]
    ]
    t_nav = Table(row5, colWidths=[col_w + 8, col_w + 8])
    t_nav.setStyle(TableStyle([
        ('ALIGN', (0,0), (-1,-1), 'CENTER'),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 3),
    ]))
    story.append(t_nav)
    story.append(Spacer(1, 10))

    nav_summary = """
    <b>Mapping Physical Realities to Campus SmartQueue 2.0:</b><br/>
    1. <b>Digital FastPass Waypoints:</b> When students reserve a virtual token via <code>/api/take-token</code>, their boarding pass identifies their exact physical destination (e.g., <i>Student Section & Exam Desk #2</i> or <i>Admission Office Desk #1</i>) and directs them to relax in the Central Quad lawn until their phone receives a 2-minute call alert.<br/>
    2. <b>Three.js 3D Digital Twin Realism:</b> The 3D campus viewer (<code>static/js/campus3d.js</code>) faithfully reproduces the two central lawns, the IAF Jet Memorial pedestal, the red portal archway of COE, the curved IOIT auditorium, and the tree-lined avenues with dynamic time-of-day lighting.<br/>
    3. <b>Rush Hour Heatmap Calibration:</b> The Erlang C queue solver ($M/M/c$) directly reflects the physical capacity constraints observed in the drone shots—preventing corridor bottlenecks at the Central Canteen (12:30 PM) and Xerox Counter (09:00 AM).
    """
    t_nav_box = Table([[Paragraph(nav_summary, body_style)]], colWidths=[720])
    t_nav_box.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#f8fafc')),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#38bdf8')),
        ('PADDING', (0,0), (-1,-1), 10),
    ]))
    story.append(t_nav_box)
    story.append(Spacer(1, 10))

    # Footer note
    story.append(Paragraph("<b>Report Generated:</b> Campus SmartQueue 2.0 Engineering Team (Kaif Sayyed, Faizan Shaikh, Sushant Borkar, Kalpesh Urade) | AISSMS COE Pune (EN6278)", ParagraphStyle('Foot', parent=styles['Normal'], fontSize=8, textColor=colors.HexColor('#64748b'), alignment=1)))

    doc.build(story)
    print("SUCCESS: Generated PDF at", pdf_path)

if __name__ == "__main__":
    create_campus_guide_pdf()
