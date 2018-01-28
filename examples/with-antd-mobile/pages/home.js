import React, { Component } from 'react'
import {
  WhiteSpace, WingBlank,
  NavBar, Icon,
  Grid
} from 'antd-mobile'
import Layout from '../components/Layout'
import MenuBar from '../components/MenuBar'
//import styles from '../assets/base.scss'

export default class Home extends Component {
  static getInitialProps({ req }) {
    const language = req ? req.headers['accept-language'] : navigator.language
    return {
      language
    }
  }

  render() {
    const {
      language,
      url: { pathname }
    } = this.props

    return (
      <Layout language={language}>
        {/* <style dangerouslySetInnerHTML={{ __html: stylesheet }} /> */} 
        <MenuBar
          pathname={pathname}
        >
          <NavBar
            leftContent='back'
            mode='light'
            onLeftClick={() => console.log('onLeftClick')}
            rightContent={[
              <Icon key='0' type='search' style={{ marginRight: '0.32rem' }} />,
              <Icon key='1' type='ellipsis' />
            ]}
          >
          </NavBar>
            <Grid data={data} activeStyle={false} />
            <p> test name </p>
        </MenuBar>
      </Layout>
    )
  }
}

const data = Array.from(new Array(9)).map((_val, i) => ({
  icon: 'https://gw.alipayobjects.com/zos/rmsportal/nywPmnTAvTmLusPxHPSu.png',
  text: `name${i}`,
}));
