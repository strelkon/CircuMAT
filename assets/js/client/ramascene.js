// @flow
import React, {Component} from 'react';
import {render, unmountComponentAtNode} from 'react-dom';
import { Alert, Button, ButtonGroup, Col, Glyphicon, Grid, Image, Modal, Nav, Navbar, NavItem, OverlayTrigger, Panel, Popover, Row, Table } from 'react-bootstrap';
import './stylesheets/ramascene.scss';
import Visualization from './visualization';
import ProductFilterableMultiSelectDropdownTree from './productFilterableMultiSelectDropdownTree';
import ProductFilterableSingleSelectDropdownTree from './productFilterableSingleSelectDropdownTree';
import RegionFilterableSingleSelectDropdownTree from './regionFilterableSingleSelectDropdownTree';
import RegionFilterableMultiSelectDropdownTree from './regionFilterableMultiSelectDropdownTree';
import IndicatorFilterableSingleSelectDropdownTree from './indicatorFilterableSingleSelectDropdownTree';
import YearFilterableSingleSelectDropdownTree from './yearFilterableSingleSelectDropdownTree';
import AnalysisJob from './analysisJob';
import ScenarioModel from "./ScenarioModel";
import PropTypes from 'prop-types';
import ReactGA from 'react-ga';

ReactGA.initialize('UA-130048269-1', {
    gaOptions: {
        siteSpeedSampleRate: 50
    }
});

ReactGA.pageview('/ramascene/');

const WAIT_INTERVAL = 5000;

var shortid = require('shortid');
var {selection_menu_helptext, perspective_helptext,product_helptext,indicator_helptext,modelling_menu_helptext, analysis_queue_helptext, product_model_helptext} = require('./helptexts');

function CustomTooltip({id, children, tooltip}) {
    return (
        <OverlayTrigger trigger="click" rootClose
            overlay={<Popover id="{id}"  placement="right"><div dangerouslySetInnerHTML={{__html: tooltip}}></div></Popover>}
            delayShow={300}
            delayHide={150}
        >{children}
        </OverlayTrigger>
    );
};

class App extends Component {

    constructor(props) {
        super(props);

        this.PERSPECTIVE_PRODUCTION = 'Production';
        this.PERSPECTIVE_CONSUMPTION = 'Consumption';
        this.VIZ_TREEMAP = 'TreeMap';
        this.VIZ_GEOMAP = 'GeoMap';
        this.VIZDETAIL_TOTAL = 'total';
        this.VIZDETAIL_CONTINENT = 'continent';
        this.VIZDETAIL_COUNTRY = 'country';

        this.MAX_JOB_COUNT = 10;

        this.state = {
            selectedPerspectiveOption: this.PERSPECTIVE_PRODUCTION,
            selectedVisualizationOption: this.VIZ_TREEMAP,
            selectedVisualizationDetailOption: this.VIZDETAIL_COUNTRY,
            selectedYearOption: [2011],
            selectedProductOptions: [],
            selectedRegionOptions: [],
            selectedIndicatorOptions: [],
            selectMultiProduct: true,
            selectMultiRegion: false,
            busy: true,
            jobs: [],
            model_details: [],
            waiting_modal_open: false
        };

        this.scenarioCompRef = null;
        this.setScenarioRef = component => {
            this.scenarioCompRef = component;
        };

        this.timer = null;
    }

    handleProductionClicked() {
        this.setState({
            selectedPerspectiveOption: this.PERSPECTIVE_PRODUCTION
        });
    }

    handleConsumptionClicked() {
        this.setState({
            selectedPerspectiveOption: this.PERSPECTIVE_CONSUMPTION
        });
    }

    handleTreeMapClicked() {
        this.setState({
            selectedVisualizationOption: this.VIZ_TREEMAP,
            // selectedRegionOptions: (Array.isArray(this.state.selectedRegionOptions) ? this.state.selectedRegionOptions.slice(0,1) : this.state.selectedRegionOptions),
            selectedProductOptions: [],
            selectedRegionOptions: [],
            selectMultiProduct: true,
            selectMultiRegion: false
        });
    }

    handleGeoMapClicked() {
        this.setState({
            selectedVisualizationOption: this.VIZ_GEOMAP,
            // selectedProductOptions: (Array.isArray(this.state.selectedProductOptions) ? this.state.selectedProductOptions.slice(0,1) : this.state.selectedProductOptions),
            selectedProductOptions: [],
            selectedRegionOptions: [],
            selectMultiProduct: false,
            selectMultiRegion: true
        });
    }

    handleTotalClicked() {
        this.setState({
            selectedVisualizationDetailOption: this.VIZDETAIL_TOTAL,
            selectedRegionOptions: []
        });
    }

    handleContinentClicked() {
        this.setState({
            selectedVisualizationDetailOption: this.VIZDETAIL_CONTINENT,
            selectedRegionOptions: []
        });
    }

    handleCountryClicked() {
        this.setState({
            selectedVisualizationDetailOption: this.VIZDETAIL_COUNTRY,
            selectedRegionOptions: []
        });
    }

    handleDeleteAllClicked() {
        this.setState({jobs: []});

        unmountComponentAtNode(document.getElementById('visualization'));
        unmountComponentAtNode(document.getElementById('comparison-visualization'));
    }

    handleYearChange(value) {
        this.setState({
            selectedYearOption: value
        });
    }

    handleProductChange(value) {
        this.setState({
            selectedProductOptions: value
        });
    }

    handleRegionChange(value) {
        this.setState({
            selectedRegionOptions: value
        });
    }

    handleIndicatorChange(value) {
        this.setState({
            selectedIndicatorOptions: value
        });
    }

    handleAnalyse() {
        ReactGA.event({
            category: 'User',
            action: 'started analysis job'
        });

        // make sure for single select dropdown trees that value is presented as an array
        var nodesSec = null;
        var nodesReg = null;
        var extn = null;
        var year = null;
        if (!Array.isArray(this.state.selectedProductOptions)) {
            nodesSec = [parseInt(this.state.selectedProductOptions)];
        } else {
            nodesSec = this.state.selectedProductOptions.map(x => parseInt(x));
        }
        if (!Array.isArray(this.state.selectedRegionOptions)) {
            nodesReg = [parseInt(this.state.selectedRegionOptions)];
        } else {
            nodesReg = this.state.selectedRegionOptions.map(x => parseInt(x));
        }
        if (!Array.isArray(this.state.selectedIndicatorOptions)) {
            extn = [parseInt(this.state.selectedIndicatorOptions)];
        } else {
            extn = this.state.selectedIndicatorOptions.map(x => parseInt(x));
        }
        if (!Array.isArray(this.state.selectedYearOption)) {
            year = [parseInt(this.state.selectedYearOption)];
        } else {
            year = this.state.selectedYearOption.map(x => parseInt(x));
        }

        const query = {
            'dimType': this.state.selectedPerspectiveOption,
            'vizType': this.state.selectedVisualizationOption,
            'nodesSec': nodesSec,
            'nodesReg': nodesReg,
            'extn': extn,
            'year': year
        };

        const jobs = Object.assign([], this.state.jobs);
        jobs.push({key: shortid.generate(), query: query, in_main_view: false, in_comparison_view: false, auto_render: false, detailLevel: this.state.selectedVisualizationDetailOption});

        this.setState({
            busy: true,
            jobs: jobs,
            waiting_modal_open: true
        });

        clearTimeout(this.timer);
        this.timer = setTimeout(this.closeModal.bind(this), WAIT_INTERVAL);
    }

    handleModelling() {
        this.setState({
            busy: true,
            waiting_modal_open: true
        });

        clearTimeout(this.timer);
        this.timer = setTimeout(this.closeModal.bind(this), WAIT_INTERVAL);
    }

    closeModal() {
        clearTimeout(this.timer);
        this.setState({waiting_modal_open: false});
    }

    handleJobFinished() {
        clearTimeout(this.timer);
        this.setState({
            busy: false,
            waiting_modal_open: false
        });
    }

    componentWillMount() {
        const query = {
            'dimType': this.PERSPECTIVE_PRODUCTION,
            'vizType': this.VIZ_TREEMAP,
            'nodesSec': [2,3,4,5,6,7,8,9,10,11,12,13,14,15,16],
            'nodesReg': [66],
            'extn': [1],
            'year': [2011]
        };

        const jobs = Object.assign([], this.state.jobs);
        jobs.push({key: shortid.generate(), query: query, in_main_view: false, in_comparison_view: false, auto_render: true, detailLevel: this.VIZDETAIL_COUNTRY});

        this.setState({
            busy: true,
            jobs: jobs,
            waiting_modal_open: true
        });

        clearTimeout(this.timer);
        this.timer = setTimeout(this.closeModal.bind(this), WAIT_INTERVAL);
    }

    renderVisualization(data, unit, is_modelling_result, model_details, job_name, key) {
        // jobs array
        const jobs = Object.assign([], this.state.jobs);

        // deselect currently in_main_view job
        const current_selected_index = this.state.jobs.findIndex((job) => {
            return job.in_main_view == true;
        });
        if (current_selected_index >= 0) {
            const current_selected_job = Object.assign({}, this.state.jobs[current_selected_index]);
            current_selected_job.in_main_view = false;
            jobs[current_selected_index] = current_selected_job;
        }

        // select newly in_main_view job
        const index = this.state.jobs.findIndex((job) => {
            return job.key === key;
        });
        const job = Object.assign({}, this.state.jobs[index]);
        job.in_main_view = true;
        jobs[index] = job;

        this.setState({
            jobs: jobs
        });

        // convert model details to human readable
        var new_model_details = [];
        if (is_modelling_result) {
            model_details.forEach(function (model_detail) {
                new_model_details.push({
                    product: this.scenarioCompRef.getProductLabel(model_detail.product[0]),
                    consumedBy: this.scenarioCompRef.getConsumerLabel(model_detail.consumedBy[0]),
                    consumedReg: this.scenarioCompRef.getDestLabel(model_detail.consumedReg[0]),
                    techChange: model_detail.techChange[0]
                });
            }.bind(this));
        }

        switch (job.query.vizType) {
            case this.VIZ_TREEMAP:
                var tree_data = [];
                Object.keys(data).forEach(function(key) {
                    const value = data[key];
                    tree_data.push({id: key, value: value});
                });
                render(<Visualization type='tree' data={tree_data} unit={unit} model_details={new_model_details} query={job_name} is_modelling_result={is_modelling_result} hide_callback={this.hideMainView.bind(this)}/>, document.getElementById('visualization'));
                break;
            case this.VIZ_GEOMAP:
                var geo_data = [];
                Object.keys(data).forEach(function (key) {
                    const value = data[key];
                    geo_data.push({id: key, value: value});
                });
                render(<Visualization type='geo' detailLevel={job.detailLevel} data={geo_data} unit={unit} model_details={new_model_details} query={job_name} is_modelling_result={is_modelling_result} hide_callback={this.hideMainView.bind(this)}/>, document.getElementById('visualization'));
                break;
            default:
                break;
        }
    }

    renderComparisonVisualisation(data, unit, is_modelling_result, model_details, job_name, key) {
        // jobs array
        const jobs = Object.assign([], this.state.jobs);

        // deselect currently in_comparison_view job
        const current_selected_index = this.state.jobs.findIndex((job) => {
            return job.in_comparison_view == true;
        });
        if (current_selected_index >= 0) {
            const current_selected_job = Object.assign({}, this.state.jobs[current_selected_index]);
            current_selected_job.in_comparison_view = false;
            jobs[current_selected_index] = current_selected_job;
        }

        // select newly in_comparison_view job
        const index = this.state.jobs.findIndex((job) => {
            return job.key === key;
        });
        const job = Object.assign({}, this.state.jobs[index]);
        job.in_comparison_view = true;
        jobs[index] = job;

        this.setState({
            jobs: jobs
        });

        // convert model details to human readable
        var new_model_details = [];
        if (is_modelling_result) {
            model_details.forEach(function (model_detail) {
                new_model_details.push({
                    product: this.scenarioCompRef.getProductLabel(model_detail.product[0]),
                    consumedBy: this.scenarioCompRef.getConsumerLabel(model_detail.consumedBy[0]),
                    originReg: this.scenarioCompRef.getOrigLabel(model_detail.originReg[0]),
                    consumedReg: this.scenarioCompRef.getDestLabel(model_detail.consumedReg[0]),
                    techChange: model_detail.techChange[0]
                });
            }.bind(this));
        }

        switch (job.query.vizType) {
            case this.VIZ_TREEMAP:
                var tree_data = [];
                Object.keys(data).forEach(function(key) {
                    const value = data[key];
                    tree_data.push({id: key, value: value});
                });
                render(<Visualization type='tree' data={tree_data} unit={unit} model_details={new_model_details} query={job_name} is_modelling_result={is_modelling_result} hide_callback={this.hideComparisonView.bind(this)}/>, document.getElementById('comparison-visualization'));
                break;
            case this.VIZ_GEOMAP:
                var geo_data = [];
                Object.keys(data).forEach(function (key) {
                    const value = data[key];
                    geo_data.push({id: key, value: value});
                });
                render(<Visualization type='geo' detailLevel={job.detailLevel} data={geo_data} unit={unit} model_details={new_model_details} query={job_name} is_modelling_result={is_modelling_result} hide_callback={this.hideComparisonView.bind(this)}/>, document.getElementById('comparison-visualization'));
                break;
            default:
                break;
        }
    }

    hideMainView() {
        // jobs array
        const jobs = Object.assign([], this.state.jobs);

        // deselect currently in_main_view job
        const current_selected_index = this.state.jobs.findIndex((job) => {
            return job.in_main_view == true;
        });
        if (current_selected_index >= 0) {
            const current_selected_job = Object.assign({}, this.state.jobs[current_selected_index]);
            current_selected_job.in_main_view = false;
            jobs[current_selected_index] = current_selected_job;
        }

        this.setState({
            jobs: jobs
        });

        unmountComponentAtNode(document.getElementById('visualization'));
    }

    hideComparisonView() {
        // jobs array
        const jobs = Object.assign([], this.state.jobs);

        // deselect currently in_comparison_view job
        const current_selected_index = this.state.jobs.findIndex((job) => {
            return job.in_comparison_view == true;
        });
        if (current_selected_index >= 0) {
            const current_selected_job = Object.assign({}, this.state.jobs[current_selected_index]);
            current_selected_job.in_comparison_view = false;
            jobs[current_selected_index] = current_selected_job;
        }

        this.setState({
            jobs: jobs
        });

        unmountComponentAtNode(document.getElementById('comparison-visualization'));
    }

    deleteJob(in_main_view, in_comparison_view, key) {
        // var new_jobs = Object.assign([], this.state.jobs);
        const jobs = this.state.jobs.filter(j => j.key != key);

        this.setState({
            jobs: jobs
        });

        if (in_main_view) {
            unmountComponentAtNode(document.getElementById('visualization'));
        }

        if (in_comparison_view) {
            unmountComponentAtNode(document.getElementById('comparison-visualization'));
        }
    }

    render() {
        const selectedPerspectiveOption = this.state.selectedPerspectiveOption;
        const selectedVisualizationOption = this.state.selectedVisualizationOption;
        const selectedVisualizationDetailOption = this.state.selectedVisualizationDetailOption;

        return (
            <Grid fluid={true}>
              <Navbar fluid>
                  <Navbar.Header>
                      <Navbar.Brand>
                          {/*<Image src="../static/rama-logo-big.svgg"/>*/}
                          CircuMAT
                      </Navbar.Brand>
                       <Navbar.Toggle />
                  </Navbar.Header>
                  <Navbar.Collapse>

                  <Nav pullRight>
                    <NavItem eventKey={1} href="../">
                    Home
                  </NavItem>
                    <NavItem eventKey={1} href="../#about">
                    About
                  </NavItem>
                  <NavItem eventKey={2} href="../#methods">
                    Methods
                  </NavItem>
                  <NavItem eventKey={3} href="../#deliverables">
                    Resources
                  </NavItem>
                  <NavItem eventKey={4} href="../#contact">
                    Contact
                  </NavItem>
                  </Nav>
                  </Navbar.Collapse>
              </Navbar>
                {this.state.jobs.length == this.MAX_JOB_COUNT && <Alert bsStyle={"warning"}>
                    You reached the maximum number of jobs on your job queue. You first have to delete a job from the queue before being able to do additional analyses.
                </Alert>}
                <Row>
                    <Col sm={3} md={3} lg={3}>
                        <Panel defaultExpanded>
                            <Panel.Heading>
                                <Panel.Title toggle>
                                    Selection menu
                                </Panel.Title><CustomTooltip tooltip={selection_menu_helptext} id="selection-menu-tooltip"><Glyphicon glyph="question-sign"/></CustomTooltip>
                            </Panel.Heading>
                            <Panel.Collapse>
                                <Panel.Body>
                                    <Row>
                                        <Col>
                                            <div>Perspective<CustomTooltip tooltip={perspective_helptext} id="perspective-tooltip"><Glyphicon glyph="question-sign"/></CustomTooltip></div>
                                            <ButtonGroup>
                                                <Button onClick={this.handleProductionClicked.bind(this)}
                                                        active={selectedPerspectiveOption == this.PERSPECTIVE_PRODUCTION}
                                                        disabled={this.state.busy || this.state.jobs.length == this.MAX_JOB_COUNT}>Hotspot Analysis </Button>
                                                <Button onClick={this.handleConsumptionClicked.bind(this)}
                                                        active={selectedPerspectiveOption == this.PERSPECTIVE_CONSUMPTION}
                                                        disabled={this.state.busy || this.state.jobs.length == this.MAX_JOB_COUNT}>Contribution Analysis</Button>
                                            </ButtonGroup>
                                        </Col>
                                    </Row>
                                    {/*
                                    <Row>
                                        <Col>
                                            <div>Visualization</div>
                                            <ButtonGroup>
                                                <Button onClick={this.handleTreeMapClicked.bind(this)}
                                                        active={selectedVisualizationOption == this.VIZ_TREEMAP}
                                                        disabled={this.state.busy || this.state.jobs.length == this.MAX_JOB_COUNT}>TreeMap</Button>
                                                <Button onClick={this.handleGeoMapClicked.bind(this)}
                                                        active={selectedVisualizationOption == this.VIZ_GEOMAP}
                                                        disabled={this.state.busy || this.state.jobs.length == this.MAX_JOB_COUNT}>GeoMap</Button>
                                            </ButtonGroup>
                                        </Col>
                                    </Row>
                                  */}
                                    {(selectedVisualizationOption == this.VIZ_GEOMAP) &&
                                    <Row>
                                        <Col>
                                            <div>Geographic aggregation level</div>
                                            <ButtonGroup>
                                                <Button onClick={this.handleTotalClicked.bind(this)}
                                                        active={selectedVisualizationDetailOption == this.VIZDETAIL_TOTAL}
                                                        disabled={this.state.busy || this.state.jobs.length == this.MAX_JOB_COUNT}>Total</Button>
                                                <Button onClick={this.handleContinentClicked.bind(this)}
                                                        active={selectedVisualizationDetailOption == this.VIZDETAIL_CONTINENT}
                                                        disabled={this.state.busy || this.state.jobs.length == this.MAX_JOB_COUNT}>Continent</Button>
                                                <Button onClick={this.handleCountryClicked.bind(this)}
                                                        active={selectedVisualizationDetailOption == this.VIZDETAIL_COUNTRY}
                                                        disabled={this.state.busy || this.state.jobs.length == this.MAX_JOB_COUNT}>Country</Button>
                                            </ButtonGroup>
                                        </Col>
                                    </Row>
                                    }
                                    {/*
                                    <Row>
                                        <Col>
                                            <div>Year</div>
                                            <YearFilterableSingleSelectDropdownTree disabled={this.state.busy || this.state.jobs.length == this.MAX_JOB_COUNT}
                                                                                    onChange={this.handleYearChange.bind(this)}
                                                                                    value={this.state.selectedYearOption}
                                            />
                                        </Col>
                                    </Row>
                                  */}
                                    <Row>
                                        {/*<Col sm={6} md={6} lg={6}>*/}
                                        <Col>
                                            <div>{this.state.selectMultiRegion ? 'select multiple regions' : 'select a single NUTS2 region'}</div>
                                            {!this.state.selectMultiRegion &&
                                                <RegionFilterableSingleSelectDropdownTree disabled={this.state.busy || this.state.jobs.length == this.MAX_JOB_COUNT}
                                                                                          onChange={this.handleRegionChange.bind(this)}
                                                                                          value={this.state.selectedRegionOptions}
                                                />
                                            }
                                            {this.state.selectMultiRegion &&
                                                <RegionFilterableMultiSelectDropdownTree disabled={this.state.busy || this.state.jobs.length == this.MAX_JOB_COUNT}
                                                                                         onChange={this.handleRegionChange.bind(this)}
                                                                                         value={this.state.selectedRegionOptions}
                                                                                         selectablelevel={selectedVisualizationDetailOption == this.VIZDETAIL_COUNTRY ? 3 : selectedVisualizationDetailOption == this.VIZDETAIL_CONTINENT ? 2 : 1}
                                                />
                                            }
                                        </Col>
                                    </Row>
                                    <Row>
                                        {/*<div>Products and Regions</div>*/}
                                        {/*<Col sm={6} md={6} lg={6}>*/}
                                        <Col>
                                            <div>{this.state.selectMultiProduct ? 'select multiple products' : 'select a single product'}<CustomTooltip tooltip={product_helptext} id="product-tooltip"><Glyphicon glyph="question-sign"/></CustomTooltip></div>
                                            {this.state.selectMultiProduct &&
                                            <ProductFilterableMultiSelectDropdownTree disabled={this.state.busy || this.state.jobs.length == this.MAX_JOB_COUNT}
                                                                                      onChange={this.handleProductChange.bind(this)}
                                                                                      value={this.state.selectedProductOptions}
                                            />
                                            }
                                            {!this.state.selectMultiProduct &&
                                            <ProductFilterableSingleSelectDropdownTree disabled={this.state.busy || this.state.jobs.length == this.MAX_JOB_COUNT}
                                                                                       onChange={this.handleProductChange.bind(this)}
                                                                                       value={this.state.selectedProductOptions}
                                            />
                                            }
                                        </Col>
                                    </Row>
                                    <Row>
                                        <Col>
                                            <div>Indicator<CustomTooltip tooltip={indicator_helptext} id="indicator-tooltip"><Glyphicon glyph="question-sign"/></CustomTooltip></div>
                                            <IndicatorFilterableSingleSelectDropdownTree disabled={this.state.busy || this.state.jobs.length == this.MAX_JOB_COUNT}
                                                                                        onChange={this.handleIndicatorChange.bind(this)}
                                                                                        value={this.state.selectedIndicatorOptions}
                                            />
                                        </Col>
                                    </Row>
                                    <Row>
                                        <Col>
                                            <Button bsStyle="success" onClick={this.handleAnalyse.bind(this)} disabled={this.state.busy || this.state.jobs.length == this.MAX_JOB_COUNT || this.state.selectedYearOption === undefined || this.state.selectedYearOption <= 0 || this.state.selectedProductOptions === undefined || this.state.selectedProductOptions.length <= 0 || this.state.selectedRegionOptions === undefined || this.state.selectedRegionOptions.length <= 0 || this.state.selectedIndicatorOptions === undefined || this.state.selectedIndicatorOptions.length <= 0}><Glyphicon glyph={this.state.busy ? 'hourglass' : 'play'}/>&nbsp;Analyse</Button>
                                        </Col>
                                    </Row>
                                </Panel.Body>
                            </Panel.Collapse>
                        </Panel>
                        <Panel defaultExpanded>
                            <Panel.Heading>
                                <Panel.Title toggle>
                                    Scenario modelling
                                </Panel.Title><CustomTooltip tooltip={modelling_menu_helptext} id="product-tooltip"><Glyphicon glyph="question-sign"/></CustomTooltip>
                            </Panel.Heading>
                            <Panel.Collapse>
                                <Panel.Body>
                                    {/*<ModellingContext.Provider value={{*/}
                                        {/*saveSettingsCallback: this.saveModellingSettings.bind(this),*/}
                                        {/*clearSettingsCallback: this.clearModellingSettings.bind(this)*/}
                                    {/*}}>*/}
                                        <ScenarioModel busy={this.state.busy}
                                                       ref={this.setScenarioRef}
                                        />
                                    {/*</ModellingContext.Provider>*/}
                                </Panel.Body>
                            </Panel.Collapse>
                        </Panel>
                    </Col>
                    <Col sm={6} md={6} lg={6}>
                        <Panel defaultExpanded>
                            <Panel.Heading>
                                <Panel.Title toggle>Main View</Panel.Title>
                                <Button className="close pull-right" onClick={this.hideMainView.bind(this)} title="Close"><span>&times;</span></Button>
                            </Panel.Heading>
                            <Panel.Collapse>
                            <Panel.Body>
                                <div id="visualization"></div>
                            </Panel.Body>
                          </Panel.Collapse>
                        </Panel>
                        <Panel defaultExpanded>
                            <Panel.Heading>
                                <Panel.Title toggle>Comparison View</Panel.Title>
                                <Button className="close pull-right" onClick={this.hideComparisonView.bind(this)} title="Close"><span>&times;</span></Button>
                            </Panel.Heading>
                            <Panel.Collapse>
                            <Panel.Body>
                                <div id="comparison-visualization"></div>
                            </Panel.Body>
                          </Panel.Collapse>
                        </Panel>
                    </Col>
                    <Col sm={3} md={3} lg={3}>
                        <Panel defaultExpanded>
                            <Panel.Heading>
                                <Panel.Title>
                                    Analysis queue
                                </Panel.Title><CustomTooltip tooltip={analysis_queue_helptext} id="selection-menu-tooltip"><Glyphicon glyph="question-sign"/></CustomTooltip>
                            </Panel.Heading>
                            <Panel.Collapse>
                                <Panel.Body>
                                    {this.state.model_details.length > 0 && <Alert bsStyle={"info"}>Click on the M symbol if you are ready to model</Alert>}
                                    <div className="table-responsive">
                                        <Table striped condensed hover>
                                            <tbody>
                                            {
                                                this.state.jobs.map(function(job) {
                                                    // we cannot pass key to props, but we must use another property name e.g. id
                                                    return (<AnalysisJob key={job.key}
                                                                         busy={this.state.busy}
                                                                         id={job.key}
                                                                         query={job.query}
                                                                         in_main_view={job.in_main_view}
                                                                         in_comparison_view={job.in_comparison_view}
                                                                         auto_render={job.auto_render}
                                                                         detailLevel={job.detailLevel}
                                                                         finishHandler={this.handleJobFinished.bind(this)}
                                                                         resultHandler={this.renderVisualization.bind(this)}
                                                                         comparisonHandler={this.renderComparisonVisualisation.bind(this)}
                                                                         deleteHandler={this.deleteJob.bind(this)}
                                                                         startModellingHandler={this.handleModelling.bind(this)} />)

                                                }.bind(this))
                                            }
                                            </tbody>
                                        </Table>
                                    </div>
                                    <Button disabled={this.state.jobs.length == 0} onClick={this.handleDeleteAllClicked.bind(this)}>Delete all</Button>
                                </Panel.Body>
                            </Panel.Collapse>
                        </Panel>
                        <Panel defaultExpanded>
                            <Panel.Heading>
                                <Panel.Title >
                                    Resources
                                </Panel.Title>
                            </Panel.Heading>
                            <Panel.Collapse>
                                <Panel.Body>
                                    <h5>Manual</h5>
                                    <ul>
                                    <li><a  href="../static/CIRCUMAT_PLATFORM_USER_GUIDE.pdf">Manual</a></li>
                                    </ul>
                                    <h5>CircuMat Data</h5>
                                    <ul>
                                    <li><a  href="https://surfdrive.surf.nl/files/index.php/s/bEVnoyJUeYMUiyr">CircuMat data (password:circumat)</a></li>
                                    </ul>
                                    <h5>Additional Tools</h5>
                                    <ul>
                                    <li><a href="../online-tools">Additional Tools</a></li>
                                    </ul>
                                    <h5>Additonal databases</h5>
                                    <ul>
                                    <li><a href="../online-databases">Additional Databases</a></li>
                                    </ul>
                                    <h5>Other resources</h5>
                                    <ul>
                                        <li><a href="https://www.exiobase.eu/">EXIOBASE</a></li>
                                        <li><a href="https://cml.liacs.nl/exiovisuals/">EXIOVISUALS</a></li>
                                        <li><a href="https://ramascene.eu">Rama-Scene</a></li>

                                    </ul>
                                </Panel.Body>
                            </Panel.Collapse>
                        </Panel>
                        <Panel defaultExpanded>
                            <Panel.Heading>
                                <Panel.Title>
                                    Partners
                                </Panel.Title>
                            </Panel.Heading>
                            <Panel.Collapse>
                                <Panel.Body>
                                    <Image src="../static/partners.png" responsive />
                                    <Image src="../static/EIT_EU_logos/EU-Flag-2020_100px.png" responsive />
                                </Panel.Body>
                            </Panel.Collapse>
                        </Panel>
                    </Col>
                </Row>
                <Modal show={this.state.waiting_modal_open} onHide={this.closeModal.bind(this)}>
                    <Modal.Header closeButton>
                        {/*<Modal.Title></Modal.Title>*/}
                    </Modal.Header>
                    <Modal.Body>
                    <p>This may take a while - expected min. wait time 2 seconds for analytical calculations, max. wait time 10minutes or longer at heavy traffic and doing modelling</p>
                    </Modal.Body>
                </Modal>
            </Grid>
        );
    }

    getChildContext() {
        return {
            model_details: this.state.model_details,
            saveSettingsCallback: this.saveModellingSettings.bind(this),
            clearSettingsCallback: this.clearModellingSettings.bind(this),
            scenarioCompRef: this.scenarioCompRef
        };
    }

    saveModellingSettings(model_details) {
        this.setState({model_details: model_details});
    }

    clearModellingSettings() {
        this.setState({model_details: []});
    }
}

App.childContextTypes = {
    model_details: PropTypes.array,
    saveSettingsCallback: PropTypes.func,
    clearSettingsCallback: PropTypes.func,
    scenarioCompRef: PropTypes.object
};

render(<App />, document.getElementById('container'));
