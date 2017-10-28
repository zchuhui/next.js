import React from 'react'
const out = new Array(10000)

const getItems = () => {
  for (let i = 0; i < 10000; i++) {
    out[i] = <li key={i}>This is row9 {i + 1}</li>
  }
  return out
}

const items = getItems()

export default () => {
  return (
    <ul>
      {items}
    </ul>
  )
}
