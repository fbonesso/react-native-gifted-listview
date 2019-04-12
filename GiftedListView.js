'use strict'

var React = require('react');

var createReactClass = require('create-react-class');

var {
  ListView,
  Platform,
  TouchableHighlight,
  TouchableOpacity,
  ActivityIndicator,
  View,
  Text,
  RefreshControl,
  Dimensions
} = require('react-native');

// Icons
import Icon from 'react-native-vector-icons/FontAwesome';

import PropTypes from 'prop-types';

// Animatable
import * as Animatable from 'react-native-animatable';

// small helper function which merged two objects into one
function MergeRecursive(obj1, obj2) {
  for (var p in obj2) {
    try {
      if ( obj2[p].constructor==Object ) {
        obj1[p] = MergeRecursive(obj1[p], obj2[p]);
      } else {
        obj1[p] = obj2[p];
      }
    } catch(e) {
      obj1[p] = obj2[p];
    }
  }
  return obj1;
}

var GiftedListView = createReactClass({
  displayName: 'GiftedListView',

  getDefaultProps() {
    return {
      customStyles: {},
      initialListSize: 10,
      firstLoader: true,
      pagination: true,
      refreshable: true,
      refreshableColors: undefined,
      refreshableProgressBackgroundColor: undefined,
      refreshableSize: undefined,
      refreshableTitle: undefined,
      refreshableTintColor: undefined,
      renderRefreshControl: null,
      headerView: null,
      sectionHeaderView: null,
      scrollEnabled: true,
      withSections: false,
      autoPaginate: false,
      onFetch(page, callback, options) { callback([]); },

      paginationFetchingView: null,
      paginationAllLoadedView: null,
      paginationWaitingView: null,
      emptyView: null,
      renderSeparator: null,
      rowHasChanged:null,
      distinctRows:null,
    };
  },

  propTypes: {
    customStyles: PropTypes.object,
    initialListSize: PropTypes.number,
    firstLoader: PropTypes.bool,
    pagination: PropTypes.bool,
    refreshable: PropTypes.bool,
    refreshableColors: PropTypes.array,
    refreshableProgressBackgroundColor: PropTypes.string,
    refreshableSize: PropTypes.string,
    refreshableTitle: PropTypes.string,
    refreshableTintColor: PropTypes.string,
    renderRefreshControl: PropTypes.func,
    headerView: PropTypes.func,
    sectionHeaderView: PropTypes.func,
    goTop: PropTypes.func,
    scrollEnabled: PropTypes.bool,
    withSections: PropTypes.bool,
    autoPaginate: PropTypes.bool,
    onFetch: PropTypes.func,

    paginationFetchingView: PropTypes.func,
    paginationAllLoadedView: PropTypes.func,
    paginationWaitingView: PropTypes.func,
    emptyView: PropTypes.func,
    renderSeparator: PropTypes.func,

    rowHasChanged:PropTypes.func,
    distinctRows:PropTypes.func,
  },

  _setPage(page) { this._page = page; },
  _getPage() { return this._page; },
  _setRows(rows) { this._rows = rows; },
  _getRows() { return this._rows; },

  paginationFetchingView() {
    if (this.props.paginationFetchingView) {
      return this.props.paginationFetchingView();
    }

    return (
      <View style={[this.defaultStyles.paginationView, this.props.customStyles.paginationView]}>
        <ActivityIndicator />
      </View>
    );
  },

  paginationAllLoadedView() {
    if (this.props.paginationAllLoadedView) {
      return this.props.paginationAllLoadedView();
    }

    if (this._rows.length == 0) {
      return (
        <View style={this.defaultStyles.noResultsContainer}>
          <Icon name="search" size={100} color={"#ccc"} />
          <Text style={this.defaultStyles.noResultsTitle}>Nenhum resultado :(</Text>
          <Text style={this.defaultStyles.noResultsSubtitle}>Não foi possível encontrar nenhum resultado para esta pesquisa.</Text>
        </View>
      );
    }
    else {
      return (
        <View style={[this.defaultStyles.paginationView, this.props.customStyles.paginationView]}>
          <Text style={[this.defaultStyles.actionsLabel, this.props.customStyles.actionsLabel]}>
            <Icon name="smile-o" size={28} />
          </Text>
        </View>
      );
    }
  },

  paginationWaitingView(paginateCallback) {
    if (this.props.paginationWaitingView) {
      return this.props.paginationWaitingView(paginateCallback);
    }

    return (
      <TouchableHighlight
        underlayColor='#c8c7cc'
        onPress={paginateCallback}
        style={[this.defaultStyles.paginationView, this.props.customStyles.paginationView]}
      >
        <Text style={[this.defaultStyles.actionsLabel, this.props.customStyles.actionsLabel]}>
          Carregar mais
        </Text>
      </TouchableHighlight>
    );
  },

  headerView() {
    if (this.state.paginationStatus === 'firstLoad' || !this.props.headerView){
      return null;
    }
    return this.props.headerView();
  },

  goTop() {
    this.refs.listview.scrollTo({x:0, y:0, animated:true});
    this.state.isShowToTop = false;
  },

  emptyView(refreshCallback) {
    if (this.props.emptyView) {
      return this.props.emptyView(refreshCallback);
    }

    return (
      <View style={[this.defaultStyles.defaultView, this.props.customStyles.defaultView]}>
        <Text style={[this.defaultStyles.defaultViewTitle, this.props.customStyles.defaultViewTitle]}>
          Sorry, there is no content to display
        </Text>

        <TouchableHighlight
          underlayColor='#c8c7cc'
          onPress={refreshCallback}
        >
          <Text>
            ↻
          </Text>
        </TouchableHighlight>
      </View>
    );
  },

  renderSeparator() {
    if (this.props.renderSeparator) {
      return this.props.renderSeparator();
    }

    return (
      <View style={[this.defaultStyles.separator, this.props.customStyles.separator]} />
    );
  },

  getInitialState() {
    this._setPage(1);
    this._setRows([]);

    var ds = null;
    if (this.props.withSections === true) {
      ds = new ListView.DataSource({
        rowHasChanged: this.props.rowHasChanged?this.props.rowHasChanged:(row1, row2) => row1 !== row2,
        sectionHeaderHasChanged: (section1, section2) => section1 !== section2,
      });
      return {
        dataSource: ds.cloneWithRowsAndSections(this._getRows()),
        isRefreshing: false,
        paginationStatus: 'firstLoad',
        isShowToTop: false,
      };
    } else {
      ds = new ListView.DataSource({
        rowHasChanged: this.props.rowHasChanged?this.props.rowHasChanged:(row1, row2) => row1 !== row2,
      });
      return {
        dataSource: ds.cloneWithRows(this._getRows()),
        isRefreshing: false,
        paginationStatus: 'firstLoad',
        isShowToTop: false,
      };
    }
  },

  componentDidMount() {
    this.props.onFetch(this._getPage(), this._postRefresh, {firstLoad: true});
  },

  setNativeProps(props) {
    this.refs.listview.setNativeProps(props);
  },

  _onRefresh(options = {}) {
    if (!options.external) {
      this.setState({
        isRefreshing: true,
      });
    }

    this._setPage(1);
    this.props.onFetch(this._getPage(), this._postRefresh, options);
  },

  _postRefresh(rows = [], options = {}) {
    this._updateRows(rows, options);
  },

  _onPaginate() {
    if (this.state.paginationStatus === 'firstLoad') {
      this.setState({paginationStatus: 'fetching'});
      this.props.onFetch(this._getPage() + 1, this._postPaginate, {});
    }
  },

  _postPaginate(rows = [], options = {}) {
    this._setPage(this._getPage() + 1);
    var mergedRows = null;
    if (this.props.withSections === true) {
      mergedRows = MergeRecursive(this._getRows(), rows);
    } else {
      mergedRows = this._getRows().concat(rows);
    }

    if(this.props.distinctRows){
      mergedRows = this.props.distinctRows(mergedRows);
    }

    this._updateRows(mergedRows, options);
  },

  _updateRows(rows = [], options = {}) {
    let state = {
      isRefreshing: false,
      paginationStatus: (options.allLoaded === true ? 'allLoaded' : 'waiting'),
    };

    if (rows !== null) {
      this._setRows(rows);
      if (this.props.withSections === true) {
        state.dataSource = this.state.dataSource.cloneWithRowsAndSections(rows);
      } else {
        state.dataSource = this.state.dataSource.cloneWithRows(rows);
      }
    }

    this.setState(state);

    //this must be fired separately or iOS will call onEndReached 2-3 additional times as
    //the ListView is filled. So instead we rely on React's rendering to cue this task
    //until after the previous state is filled and the ListView rendered. After that,
    //onEndReached callbacks will fire. See onEndReached() above.
    if(!this.state.firstLoadComplete) this.setState({firstLoadComplete: true});
  },

  _renderPaginationView() {
    let paginationEnabled = this.props.pagination === true || this.props.autoPaginate === true;

    if ((this.state.paginationStatus === 'fetching' && paginationEnabled)) {
      return this.paginationFetchingView();
    } else if (this.state.paginationStatus === 'waiting' && this.props.pagination === true && (this.props.withSections === true || this._getRows().length > 0)) { //never show waiting for autoPaginate
      return this.paginationWaitingView(this._onPaginate);
    } else if (this.state.paginationStatus === 'allLoaded' && paginationEnabled) {
      return this.paginationAllLoadedView();
    } else if (this._getRows().length === 0) {
      return this.paginationAllLoadedView();
    } else {
      return this.paginationAllLoadedView();
    }
  },

  onEndReached() {
    if(!this.state.firstLoadComplete) return;

    if (this.props.autoPaginate) {
      this._onPaginate();
    }
    if (this.props.onEndReached) {
      this.props.onEndReached();
    }
  },

  _onScroll(e) {
    var offsetY = e.nativeEvent.contentOffset.y;

    if(offsetY > 100) {
      this.setState({
          isShowToTop: true
      })
    } else {
      this.setState({
          isShowToTop: false
      })
    }

    if (this.props.eventScroll) {
      this.props.eventScroll(e);
    }
  },

  renderRefreshControl() {
    if (this.props.renderRefreshControl) {
      return this.props.renderRefreshControl({ onRefresh: this._onRefresh });
    }
    return (
      <RefreshControl
        onRefresh={this._onRefresh}
        refreshing={this.state.isRefreshing}
        colors={this.props.refreshableColors}
        progressBackgroundColor={this.props.refreshableProgressBackgroundColor}
        size={this.props.refreshableSize}
        tintColor={this.props.refreshableTintColor}
        title={this.props.refreshableTitle}
      />
    );
  },

  render() {
    return (
      <View style={{flex: 1}}>
        <ListView
          ref="listview"
          dataSource={this.state.dataSource}
          renderRow={this.props.rowView}
          renderSectionHeader={this.props.sectionHeaderView}
          renderHeader={this.headerView}
          renderFooter={this._renderPaginationView}
          renderSeparator={this.renderSeparator}
          onScroll={(e)=>this._onScroll(e)}
          onEndReached={this.onEndReached}
          automaticallyAdjustContentInsets={false}
          scrollEnabled={this.props.scrollEnabled}
          canCancelContentTouches={true}
          refreshControl={this.props.refreshable === true ? this.renderRefreshControl() : null}

          {...this.props}

          style={this.props.style}
        >
      </ListView>
      {this.state.isShowToTop?
        <View style={this.defaultStyles.scroll_to_top_container}>
          <TouchableOpacity onPress={() => { this.refs.listview.scrollTo({x:0, y:0, animated:true}); this.state.isShowToTop = false; }} >
            <Animatable.View animation="bounceIn" style={this.defaultStyles.scroll_to_top}>
              <Icon name="angle-up" style={this.defaultStyles.scroll_to_top_icon} />
            </Animatable.View>
          </TouchableOpacity>
        </View>
      :null}
      </View>
    );
  },

  defaultStyles: {
    separator: {
      height: 1,
      backgroundColor: '#fff'
    },
    actionsLabel: {
      fontSize: 20,
      color: "#ccc"
    },
    paginationView: {
      height: 44,
      justifyContent: 'center',
      alignItems: 'center',
    },
    defaultView: {
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },
    defaultViewTitle: {
      fontSize: 16,
      fontWeight: 'bold',
      marginBottom: 15,
    },
    scroll_to_top_container: {
      flex: 1,
      width: Dimensions.get('window').width,
      position: 'absolute',
      alignItems: 'center',
      justifyContent: 'center',
      top: 0,
    },
    scroll_to_top: {
      width:25,
      height:25,
      borderRadius: 25 / 2,
      marginTop:10,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      backgroundColor: 'rgba(0, 0, 0, 0.2)'
    },
    scroll_to_top_icon: {
      color: 'white',
      fontSize:22,
      marginTop:-2,
    },
    noResultsContainer: {
      flex: 1,
      height: Dimensions.get('window').height - 230,
      justifyContent: 'center',
      alignItems: 'center'
    },
    noResultsTitle: {
      fontSize: 18,
      marginTop: 30,
      marginBottom: 10,
      color: "#ccc",
      fontWeight: "bold"
    },
    noResultsSubtitle: {
      fontSize: 16,
      paddingLeft: 20,
      paddingRight: 20,
      color: "#ccc",
      textAlign: "center"
    },
  },
});


module.exports = GiftedListView;
