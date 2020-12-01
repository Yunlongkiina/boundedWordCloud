
/* 
-Get city shape points in Cartesian coordinate system
-Zoom city shape to desired size
*/
const LOWER_COORDINATE_THRESHOLD = 600;
const UPPER_COORDINATE_THRESHOLD = 700;

// convert object array to array
const processCityShapePoints = (pointsObjArr) => {
  let convexHullPointsArr = [];

  for (let j = 0; j < pointsObjArr.length; j++) {
    convexHullPointsArr[j] = [pointsObjArr[j].lat, pointsObjArr[j].lng];
  }
  return convexHullPointsArr;
}

const convertLatLngToCartesianCoordinateRadu = (latLngPointsArr, map) => {

  const latAndLonPoints = latLngPointsArr;
  const carteCooPointsArr = [];
  const projection = map.getProjection();


  for (let i = 0; i < latAndLonPoints.length; i++) {
    const lat = latAndLonPoints[i][0];
    const lon = latAndLonPoints[i][1];
    const point = projection.fromLatLngToPoint(new google.maps.LatLng(lat, lon));

    carteCoo_Y = point.y;
    carteCoo_X = point.x;
    // z = (rad * S + h) * sinLat;

    carteCooPointsArr.push([carteCoo_X, carteCoo_Y]);
  }

  return carteCooPointsArr;
}
// find [MinX, MaxX, MinY, MaxY]
const findMinMaxXY = (rawData) => {

  const dataArr = rawData;
  // init [MinX, MaxX, MinY, MaxY] 
  let MinX = dataArr[0][0],
    MinY = dataArr[0][1],
    MaxX = dataArr[0][0],
    MaxY = dataArr[0][1];

  if (rawData.length > 0) {
    for (let i = 0; i < dataArr.length; i = i + 1) {
      if (dataArr[i][0] < MinX) {
        MinX = dataArr[i][0];
      } else if (dataArr[i][0] > MaxX) {
        MaxX = dataArr[i][0];
      }

      if (dataArr[i][1] < MinY) {
        MinY = dataArr[i][1];
      } else if (dataArr[i][1] > MaxY) {
        MaxY = dataArr[i][1];
      }
    }
  }
  return [MinX, MaxX, MinY, MaxY];
};
// difference of MinX MaxX & MinY MaxY
const findDifferXY = (maxXYArr) => {
  const diiferX = parseFloat((maxXYArr[1] - maxXYArr[0]).toPrecision(8));
  const differY = parseFloat((maxXYArr[3] - maxXYArr[2]).toPrecision(8));
  return [diiferX, differY];
};

// a * b
const multiply = (a, b, numberMultipluy, precision) => {
  let x = a,
    y = b;
  const parameter = numberMultipluy;
  x = (x * parameter).toPrecision(precision);
  y = (y * parameter).toPrecision(precision);
  return [parseFloat(x), parseFloat(y)];
};
// find upper limitation of parameter
const findMaxPara = (differValue, threshold) => {
  let differVal = differValue,
    maxPara = 1;
  const thresholdVal = threshold,
    initPara = 10;

  while (differVal < thresholdVal) {
    differVal = differVal * initPara;
    maxPara = maxPara * initPara;
  }
  return maxPara;
};
// find how much to multiply to become >= 600 || <= 700 for given number
// convert given number to [600, 700]
const findMultiplyParameter = (differVal, lowerLimitation, upperLimitation) => {
  const LOWLIMIT = lowerLimitation,
    UPPLIMIT = upperLimitation;
  const differValue = differVal;
  let maxPara = findMaxPara(differValue, UPPLIMIT),
    minPara = 0,
    currentPara;

  if (UPPLIMIT <= differValue >= LOWLIMIT) {
    return 1;
  } else {
    // init currentPara
    currentPara = (maxPara + minPara) / 2;
    while (
      differValue * currentPara < LOWLIMIT ||
      differValue * currentPara > UPPLIMIT
    ) {
      // define new minPara
      if (differValue * currentPara < LOWLIMIT) {
        minPara = currentPara;
        currentPara = (maxPara + currentPara) / 2;
      }
      // define new maxPara
      if (differValue * currentPara > UPPLIMIT) {
        maxPara = currentPara;
        currentPara = (minPara + currentPara) / 2;
      }
    }

    return currentPara;
  }
};
// multiply parameter for city shape coordinate points
// differ x reach [600, 700] or differ y reach [600, 700]
const multiplyParameter = (differX, differY, lowLimit, uppLimit) => {
  let finalPara;

  if (differX && differY) {
    const multiplyParaX = findMultiplyParameter(differX, lowLimit, uppLimit);
    const multiplyParaY = findMultiplyParameter(differY, lowLimit, uppLimit);

    multiplyParaX >= multiplyParaY
      ? (finalPara = multiplyParaY)
      : (finalPara = multiplyParaX);
  } else {
    finalPara = 1;
  }

  return finalPara;
};

// zoom coordinates to [600, 700], both x and y is between [600, 700]
const zoomOutCoordinates = (coordinatePointsArr) => {

  if (
    coordinatePointsArr.length > 1 &&
    typeof coordinatePointsArr[0][0] === "number"
  ) {
    const ponitsArr = coordinatePointsArr;
    const minMaxXY = findMinMaxXY(ponitsArr);

    const minX = minMaxXY[0];
    const minY = minMaxXY[2];
    const differXYArr = findDifferXY(minMaxXY);
    const multiPara = multiplyParameter(
      differXYArr[0],
      differXYArr[1],
      LOWER_COORDINATE_THRESHOLD,
      UPPER_COORDINATE_THRESHOLD
    );

    const maxXUpdated = Math.floor((minMaxXY[1] - minX) * multiPara);
    const maxYUpdated = Math.floor((minMaxXY[3] - minY) * multiPara);

    for (let i = 0; i < ponitsArr.length; i = i + 1) {
      ponitsArr[i][0] = Math.floor((ponitsArr[i][0] - minX) * multiPara);
      ponitsArr[i][1] = Math.floor((ponitsArr[i][1] - minY) * multiPara);
    }
    return {
      points: ponitsArr,
      maxXY_Updated: [maxXUpdated, maxYUpdated],
    };
  } else {
    return {
      points: [
        [20, 20],
        [0, 200],
        [300, 500],
        [500, 500],
        [500, 100],
      ],
      maxXY_Updated: [500, 500],
    };
  }

};

// result see cityShape.png
const cityshapePixelArr = (pointsArr) => {
  let points = pointsArr.points;
  const canvasWidth = pointsArr.maxXY_Updated[0];
  const canvasHeight = pointsArr.maxXY_Updated[1];
  CANVAS_WIDTH = canvasWidth;
  CANVAS_HEIGHT = canvasHeight;
  const cityShapeCan = document.createElement("canvas");
  cityShapeCan.width = canvasWidth;
  cityShapeCan.height = canvasHeight;
  let cityShapeContext;

  if (cityShapeCan.getContext) {
    cityShapeContext = cityShapeCan.getContext("2d");
    cityShapeContext.beginPath();
    cityShapeContext.moveTo(points[0][0], points[0][1]);
    for (let i = 0; i < points.length; i = i + 1) {
      cityShapeContext.lineTo(points[i][0], points[i][1]);
    }
    cityShapeContext.lineTo(points[0][0], points[0][1]);

    cityShapeContext.fillStyle = "rgba(0, 0, 0, 255)";
    cityShapeContext.fill();
  }

  const imData = cityShapeContext.getImageData(0, 0, canvasWidth, canvasHeight);
  const pixels = imData.data;
  const cityShapePixelArray = [];

  let tem;

  // if r+g+b+a != 0 something inside
  for (let i = 0; i < canvasWidth * canvasHeight; i += 1) {
    tem =
      pixels[i * 4 + 0] +
      pixels[i * 4 + 1] +
      pixels[i * 4 + 2] +
      pixels[i * 4 + 3];

    if (tem == 0) {
      cityShapePixelArray[i] = 255;
    } else {
      cityShapePixelArray[i] == 0;
    }
  }
  return {
    pixelArr: cityShapePixelArray,
    canvasSize: [canvasWidth, canvasHeight],
  };
};

/* 
- Generate bounded word cloud with given words and shape
-Zoom city shape to desired size
*/

const MinBoxSize = 1; // minimun bounding box size
const fontFamily = "sans-serif"; // font style
const virtualCanvasWidth = 350;
const virtualCanvasHeight = 300;
const maxFontSize = 55;
const minFontSize = 15;
const inputWordList = {
  Helsinki: 100,
  Espoo: 90,
  Vantaa: 10,
  Joensuu: 20,
  Kuopio: 10,
  Turku: 20,
  Oulu: 10,
  Lahti: 20,
  Pori: 30,
  Vaasa: 20,
  Tampere: 10,
  Kokkola: 20,
  Hamina: 10,
  Rovaniemi: 20,
  Porvoo: 30,
  Mikkeli: 20,
  Nokia: 10,
  Lapua: 20,
  Seinojoki: 10,
  Akaa: 20,
  Alavus: 30,
  Forssa: 20,
  Hanko: 10,
  Heinola: 20,
  Jamsa: 10,
  Imatra: 20,
  Kaarina: 30,
  Kajaani: 20,
  Kannus: 10,
  Kitee: 20,
  Kokemaki: 10,
  Kemi: 10,
  Kotka: 10,
  Laitila: 10,
  Hello: 50,
  welcome: 40,
  To: 30,
  Finland: 90,
  This: 60,
  Is: 40,
  Beautiful: 90,
  Country: 30,

};

// create canvas for getting pixcls of each word, doesnt show this canvas
const canvasGetPixcel = document.createElement("canvas");
canvasGetPixcel.width = virtualCanvasWidth;
canvasGetPixcel.height = virtualCanvasHeight;
canvasGetPixcel.style.border = "1px solid red";
const c = canvasGetPixcel.getContext("2d");

const wordFontSize = (inputWords) => {
  let multiplier;
  const maxAppearWord = Math.max(...inputWords.map((o) => o.weight));
  const minAppearWord = Math.min(...inputWords.map((o) => o.weight));
  if (maxAppearWord === minAppearWord) {
    multiplier = 0;
  } else {
    multiplier = maxFontSize - minFontSize;
  }
  for (let item in inputWords) {
    if (inputWords.hasOwnProperty(item)) {
      if (inputWords[item].weight <= 1) {
        inputWords[item].fontSize = minFontSize;
      } else {
        inputWords[item].fontSize = (maxFontSize - minFontSize) / maxAppearWord * inputWords[item].weight + minFontSize;
      }
    }
  }
  return inputWords;
};

// Bounding Volume Hierarchy Tree constructor
// topLeft x-Coordinate:topLeftX bottomRight X-Coordinate: bottomRightX
class BvhTree {
  constructor(topLeftX, topLeftY, bottomRightX, bottomRightY) {
    this.topLeftX = topLeftX;
    this.topLeftY = topLeftY;
    this.bottomRightX = bottomRightX;
    this.bottomRightY = bottomRightY;
    this.children = [];
  }

  // add children nodes
  addChildNode(children) {
    this.children = [].concat(this.children, children);
  }
}
// detect bounding box we are working on is inside word or not
const boundingBoxIsInsideWord = (wordPixel, boundingBox) => {
  const { x0, y0, x1, y1 } = boundingBox;
  const widthOfBoungBox = wordPixel.x1 - wordPixel.x0;
  const wordPixelArr = wordPixel.wordPixelArray;

  // if there is empty pixcel, then boundingBox is not inside word
  for (let i = x0; i < x1; i += 1) {
    for (let j = y0; j < y1; j += 1) {
      if (!wordPixelArr[j * widthOfBoungBox + i]) return false;
    }
  }
  return true;
};
// boundingBox intesect word or not
const boundingBoxIntersectWord = (wordPixel, boundingBox) => {
  let { x0, y0, x1, y1 } = boundingBox;
  x0 = Math.max(0, x0 - wordPixel.x0);
  y0 = Math.max(0, y0 - wordPixel.y0);
  x1 = Math.min(wordPixel.x1, x1) - wordPixel.x0;
  y1 = Math.min(wordPixel.y1, y1) - wordPixel.y0;

  const widthOfBoungBox = wordPixel.x1 - wordPixel.x0;
  const wordPixelArr = wordPixel.wordPixelArray;
  for (let j = y0; j < y1; j += 1) {
    for (let i = x0; i < x1; i += 1) {
      if (wordPixelArr[j * widthOfBoungBox + i]) return true;
    }
  }
  return false;
};
// get pxels array of each word
const getWordPixel = (text, wordfont, rotateDegree, wordWidth, wordHeight) => {
  const wordWidthOfBvh = wordWidth,
    wordHeightOfBvh = wordHeight;
  if (rotateDegree == 0) {
    const fontSize = wordfont;
    c.clearRect(0, 0, virtualCanvasWidth * 2, virtualCanvasHeight * 2);
    c.save();
    c.textBaseline = "top";
    c.font = `${~~fontSize}px ${fontFamily}`; // eslint-disable-line no-bitwise
    c.fillText(text, 0, 0);
    c.restore();
    // imageData:width、height、data
    const imageData = c.getImageData(1, 1, wordWidthOfBvh, wordHeightOfBvh);
    const pixels = imageData.data;
    const pixelArray = [];
    // if r+g+b+a != 0 something inside
    for (let i = 0; i < wordWidthOfBvh * wordHeightOfBvh; i += 1) {
      pixelArray[i] =
        pixels[i * 4 + 0] +
        pixels[i * 4 + 1] +
        pixels[i * 4 + 2] +
        pixels[i * 4 + 3];
    }
    return pixelArray;
  } else {
    const fontSize = wordfont;
    c.clearRect(0, 0, virtualCanvasWidth * 2, virtualCanvasHeight * 2);
    c.save();
    c.textBaseline = "bottom";
    c.font = `${~~fontSize}px ${fontFamily}`; // eslint-disable-line no-bitwise
    // c.translate(70, 0);
    c.rotate((rotateDegree * Math.PI) / 180);
    c.fillText(text, 0, 0);
    c.restore();
    // imageData:width、height、data
    // ImageData ctx.getImageData(sx, sy, sw, sh);
    const imageData = c.getImageData(1, 1, wordWidthOfBvh, wordHeightOfBvh);
    const pixels = imageData.data;
    const pixelArray = [];
    // if r+g+b+a != 0 something inside
    for (let i = 0; i < wordWidthOfBvh * wordHeightOfBvh; i += 1) {
      pixelArray[i] =
        pixels[i * 4 + 0] +
        pixels[i * 4 + 1] +
        pixels[i * 4 + 2] +
        pixels[i * 4 + 3];
    }
    return pixelArray;
  }
};
// bottom up build Hierarchical Bounding Box Tree for each word
const buildBvhTree = (wordPixel, boundingBox) => {
  const { x0, y0, x1, y1 } = boundingBox;
  // the bounding box we are working on to decide to separate or not(target box)
  if (boundingBoxIsInsideWord(wordPixel, boundingBox))
    return new BvhTree(x0, y0, x1, y1);
  if (boundingBoxIntersectWord(wordPixel, boundingBox)) {
    const tree = new BvhTree(x0, y0, x1, y1);
    // if boundingBox bigger than MinBoxSize, divide bounding box into four parts
    if (x1 - x0 > MinBoxSize || y1 - y0 > MinBoxSize) {
      const newX = Math.floor((x0 + x1) / 2);
      const newY = Math.floor((y0 + y1) / 2);

      const topLeft = buildBvhTree(wordPixel, {
        x0,
        y0,
        x1: newX,
        y1: newY,
      });
      const topRight = buildBvhTree(wordPixel, {
        x0: newX,
        y0,
        x1,
        y1: newY,
      });
      const bottomLeft = buildBvhTree(wordPixel, {
        x0,
        y0: newY,
        x1: newX,
        y1,
      });
      const bottomRight = buildBvhTree(wordPixel, {
        x0: newX,
        y0: newY,
        x1,
        y1,
      });
      if (topLeft) {
        tree.addChildNode(topLeft);
      }
      if (topRight) {
        tree.addChildNode(topRight);
      }
      if (bottomLeft) {
        tree.addChildNode(bottomLeft);
      }
      if (bottomRight) {
        tree.addChildNode(bottomRight);
      }

      // topLeft && tree.addChildren(topLeft)
    }
    return tree;
  }
  return null;
};
// initialize BvhTree
const initializeBvhTree = (
  text,
  wordfontS,
  rotateDegree,
  wordWidth,
  wordHeiht
) => {
  const initialBoundingBox = {
    x0: 0,
    y0: 0,
    x1: wordWidth,
    y1: wordHeiht,
  };
  return buildBvhTree(
    {
      wordPixelArray: getWordPixel(
        text,
        wordfontS,
        rotateDegree,
        wordWidth,
        wordHeiht
      ),
      ...initialBoundingBox,
    },
    initialBoundingBox
  );
};
// get width and height of given word with font zsize
const getWightHeightOfWord = (canvasContext, word) => {
  let font_size = word.fontSize;
  let txt, word_height, word_width;
  c.save();
  c.textBaseline = "top";
  canvasContext.font = `${~~font_size}px ${fontFamily}`; // eslint-disable-line no-bitwise
  word_height = font_size;
  word_width = canvasContext.measureText(txt).width;
  c.restore();
  word.wordHeight = word_height;
  word.wordWidth = Math.ceil(word_width);
  return word;
};

// x=vt∗cos(wt)
// y=vt∗cos(wt)
const moveSteps = (a, b, step) => {
  const angle = 0.27 * step;
  const x = (20 + 2 * angle) * Math.cos(angle) + a;
  const y = (20 + 2 * angle) * Math.sin(angle) + b;
  return [Math.round(x), Math.round(y)];
};
const twoBoundingBoxesIntersect = (
  subTreeA,
  subTreeB,
  positionA,
  positionB
) => {
  const [ax, ay] = positionA;
  const [bx, by] = positionB;
  return (
    subTreeA.topLeftX + ax < subTreeB.bottomRightX + bx &&
    subTreeA.topLeftY + ay < subTreeB.bottomRightY + by &&
    subTreeA.bottomRightX + ax > subTreeB.topLeftX + bx &&
    subTreeA.bottomRightY + ay > subTreeB.topLeftY + by
  );
};
// two trees overlapTest
const treesOverlaped = (treeA, treeB, positionA, positionB) => {
  if (twoBoundingBoxesIntersect(treeA, treeB, positionA, positionB)) {
    if (!treeA.children.length) {
      if (!treeB.children.length) return true;
      for (let i = 0, n = treeB.children.length; i < n; i += 1) {
        if (treesOverlaped(treeA, treeB.children[i], positionA, positionB))
          return true;
      }
    } else {
      for (let i = 0, n = treeA.children.length; i < n; i += 1) {
        if (treesOverlaped(treeB, treeA.children[i], positionB, positionA))
          return true;
      }
    }
  }
  return false;
};

const cityShapeBvhTree = (pixelsArray) => {
  const cityshapePixAr = pixelsArray.pixelArr;
  const canvasSize = pixelsArray.canvasSize;
  let bvhTreeCity;
  const initialBoundingBox = {
    x0: 0,
    y0: 0,
    x1: canvasSize[0],
    y1: canvasSize[1],
  };
  if (cityshapePixAr.length !== 0) {
    bvhTreeCity = buildBvhTree(
      { wordPixelArray: cityshapePixAr, ...initialBoundingBox },
      initialBoundingBox
    );
  } else {
    bvhTreeCity = {
      topLeftX: 0,
      topLeftY: 0,
      bottomRightX: canvasSize[0],
      bottomRightY: canvasSize[1],
      children: [],
    };
  }
  return bvhTreeCity;
};
const wordInsideCityShape = (
  wordTree,
  shapeTree,
  positionWord,
  positionShape
) => {
  const wTree = wordTree,
    sTree = shapeTree,
    wPosition = positionWord,
    sPosition = positionShape;
  if (
    0 < wPosition[0] + wTree.bottomRightX &&
    wPosition[0] + wTree.bottomRightX < CANVAS_WIDTH &&
    0 < wPosition[1] + wTree.bottomRightY &&
    wPosition[1] + wTree.bottomRightY < CANVAS_HEIGHT
  ) {
    if (treesOverlaped(wTree, sTree, wPosition, sPosition)) {
      return false;
    } else {
      return true;
    }
  } else {
    return false;
  }
};

// process data of user and return wordsList
const getKeyWords = (processedData) => {
  let rl = [];

  // create {keyword:.., weight:..}
  Object.entries(processedData).forEach(([key, value]) => {
    rl.push({ keyword: `${key}`, weight: `${value}` });
  }
  );
  const wordInitRangeX = Math.floor(CANVAS_WIDTH / 2) - 50,
    wordInitRangeY = Math.floor(CANVAS_HEIGHT / 2) - 50;

  // let rl = processedData;
  // sort object according to its weight, big weight to samll weight
  rl = rl.sort((obj1, obj2) => obj2.weight - obj1.weight);

  // add ratio property to rl
  rl = wordFontSize(rl);
  // get word height:fontsize and get word width with given font size
  rl.map((word) => {
    return getWightHeightOfWord(c, word);
  });

  const wordsList = rl.map((word) => ({
    word: word.keyword,
    wordWidthCanvas: word.wordWidth,
    wordHeightCanvas: word.wordHeight,
    bvhTree: initializeBvhTree(
      word.keyword,
      word.fontSize,
      0,
      word.wordWidth,
      word.wordHeight
    ),
    rotatebvhTree: initializeBvhTree(
      word.keyword,
      word.fontSize,
      90,
      word.wordHeight,
      word.wordWidth
    ),
    rotate: false,
    drawPosition: [
      Math.floor(Math.random() * 100) + wordInitRangeX,
      Math.floor(Math.random() * 100) + wordInitRangeY,
    ], // initialPosition at centeral point of Canvas
    fontSize: word.fontSize,
  }));

  return wordsList;
};
const currentWordBvhOverlapPw = (currentWord, pw) => {
  let overlaped = false;
  let treeB;

  for (let i = 0; i < pw.length; i++) {
    if (pw[i].rotate == false) {
      treeB = pw[i].bvhTree;
    } else {
      treeB = pw[i].rotatebvhTree;
    }
    if (
      treesOverlaped(
        currentWord.bvhTree,
        treeB,
        currentWord.drawPosition,
        pw[i].drawPosition
      )
    ) {
      overlaped = true;
      break;
    }
  }
  return overlaped;
};
const WBvhCanFindPosition = (currentWord, pw, shapeBvh) => {
  let step = 0;
  let foundPosition = false;
  let initPosition = currentWord.drawPosition;
  while (step < 500) {
    if (currentWordBvhOverlapPw(currentWord, pw)) {
      step += 0.3;
      currentWord.drawPosition = moveSteps(
        initPosition[0],
        initPosition[1],
        step
      );
    } else if (
      wordInsideCityShape(
        currentWord.bvhTree,
        shapeBvh,
        currentWord.drawPosition,
        [0, 0]
      )
    ) {
      foundPosition = true;
      break;
    } else {
      step += 0.3;
      currentWord.drawPosition = moveSteps(
        initPosition[0],
        initPosition[1],
        step
      );
    }
  }
  if (foundPosition == false) {
    currentWord.drawPosition = initPosition;
  }
  return foundPosition;
};

const currentWordRbvhOverlapPw = (currentWord, pw) => {
  let overlaped = false;
  let treeB;

  for (let i = 0; i < pw.length; i++) {
    if (pw[i].rotate == false) {
      treeB = pw[i].bvhTree;
    } else {
      treeB = pw[i].rotatebvhTree;
    }
    if (
      treesOverlaped(
        currentWord.rotatebvhTree,
        treeB,
        currentWord.drawPosition,
        pw[i].drawPosition
      )
    ) {
      overlaped = true;
      break;
    }
  }
  return overlaped;
};
const WRbvhCanFindPosition = (currentWord, pw, shapeBvh) => {
  let step = 0;
  let foundPosition = false;
  let initPosition = currentWord.drawPosition;

  while (step < 500) {
    if (currentWordRbvhOverlapPw(currentWord, pw)) {
      step += 0.3;
      currentWord.drawPosition = moveSteps(
        initPosition[0],
        initPosition[1],
        step
      );
    } else if (
      wordInsideCityShape(
        currentWord.rotatebvhTree,
        shapeBvh,
        currentWord.drawPosition,
        [0, 0]
      )
    ) {
      foundPosition = true;
      break;
    } else {
      step += 0.3;
      currentWord.drawPosition = moveSteps(
        initPosition[0],
        initPosition[1],
        step
      );
    }
  }
  return foundPosition;
};

// find a drwing position for first word
const findPositionForFirstWord = (firstWord, cityShape) => {

  let step = 0;
  let foundPosition = false;
  const wordInitPosition = firstWord.drawPosition;

  while (step < 500) {
    if (wordInsideCityShape(
      firstWord.bvhTree,
      cityShape,
      firstWord.drawPosition,
      [0, 0]
    )) {
      foundPosition = true;
      break;
    } else if (wordInsideCityShape(
      firstWord.rotatebvhTree,
      cityShape,
      firstWord.drawPosition,
      [0, 0]
    )) {
      foundPosition = true;
      break;
    } else {
      step += 0.3;
      firstWord.drawPosition = moveSteps(
        wordInitPosition[0],
        wordInitPosition[1],
        step
      );
    }
  }

  if (foundPosition) {
    firstWord.rotate = true;
  }
}

//w: input words; 
//pw: placed words;
//ww: wasted words. words that can not find position to draw
const updateDrawPositionForWords = (words, shapeBvh) => {
  let pw = [],
    ww = [];
  if (pw.length == 0) {
    findPositionForFirstWord(words[0], shapeBvh);
    pw.push(words[0]);
  }
  for (let i = words.length - 1; i > 0; i--) {
    if (WBvhCanFindPosition(words[i], pw, shapeBvh)) {
      pw.push(words[i]);
    } else if (WRbvhCanFindPosition(words[i], pw, shapeBvh)) {
      pw.push(words[i]);
      words[i].rotate = true;
    } else {
      ww.push(words[i]);
    }
  }
  return pw;
};

function drawInputwords(pFCanvas, wordsList) {
  for (let i = 0; i < wordsList.length; i += 1) {
    if (wordsList[i].rotate === true) {
      pFCanvas.save();
      pFCanvas.textBaseline = "bottom";
      pFCanvas.font = `${~~wordsList[i].fontSize}px sans-serif`; // eslint-disable-line no-bitwise
      pFCanvas.fillStyle = "red";
      pFCanvas.translate(wordsList[i].drawPosition[0], wordsList[i].drawPosition[1]);
      pFCanvas.rotate((90 * Math.PI) / 180);
      pFCanvas.fillText(wordsList[i].word, 0, 0);
      pFCanvas.restore();
    }
    else {
      pFCanvas.save();
      pFCanvas.textBaseline = "top";
      pFCanvas.font = `${~~wordsList[i].fontSize}px sans-serif`; // eslint-disable-line no-bitwise
      pFCanvas.fillStyle = "red";
      pFCanvas.fillText(
        wordsList[i].word,
        wordsList[i].drawPosition[0],
        wordsList[i].drawPosition[1]
      );
      pFCanvas.restore();
    }
  }
}
// decode canvas to base64
function convertCanvasToBase64(wordList, cityShapeBvh) {
  // prepared words list
  const wordsObjArr = getKeyWords(wordList);

  let newWordsList = updateDrawPositionForWords(wordsObjArr, cityShapeBvh);
  newWordsList = newWordsList.sort(
    (obj1, obj2) => obj2.fontSize - obj1.fontSize
  );

  const cas = document.createElement("canvas");
  const ctx = cas.getContext("2d");
  cas.width = CANVAS_WIDTH;
  cas.height = CANVAS_HEIGHT;

  drawInputwords(ctx, newWordsList);
  const base64Data = cas.toDataURL("image/png", 1); // 1 means original quatity

  // decode content in canvas to base64 format pic
  return base64Data;
}

const generateWordCloudImage = (cityshapePixelArr, wordsListRawData) => {

  const cityshapePixArr = cityshapePixelArr;
  // city shape bvh
  const cityShapeBvh = cityShapeBvhTree(cityshapePixArr);
  const base64Image = convertCanvasToBase64(wordsListRawData, cityShapeBvh);
  return base64Image;
}

// get minmum lat&lng and maximum lat&lng for LatLngBounds
const getMinMaxLatlng = (latLngArray) => {
  let minLat = latLngArray[0].lat, maxLat = latLngArray[0].lat,
    minLng = latLngArray[0].lng, maxLng = latLngArray[0].lng;

  for (let i = 1; i < latLngArray.length; i++) {
    let temLat = latLngArray[i].lat,
      temLng = latLngArray[i].lng;

    minLat = (temLat < minLat) ? temLat : minLat;
    maxLat = (temLat > maxLat) ? temLat : maxLat;
    minLng = (temLng < minLng) ? temLng : minLng;
    maxLng = (temLng > maxLng) ? temLng : maxLng;

  }
  return [minLat, maxLat, minLng, maxLng];
};

/**
 * set bounded wordc loud on Google map as overlay
 * @param  {Object} mapObj Initialized Google map object
 * @param  {Object Array} cityShapeLatLngObjArray City boundary lat/lng points. [{lat:vale, lng:value}, ...]
 * @param  {Object Array} inputWordsObjArray input words. [{word:weight},...]
*/
const initWordCloud = (mapObj, cityShapeLatLngObjArray, inputWordsObjArray) => {

  const cityShapeLatLng = cityShapeLatLngObjArray;

  // This example adds hide() and show() methods to a custom overlay's prototype.
  // These methods toggle the visibility of the container <div>.
  // Additionally, we add a toggleDOM() method, which attaches or detaches the
  // overlay to or from the map.
  class WordCloudOverlay extends google.maps.OverlayView {
    constructor(bounds, image, map) {
      super(bounds, image, map);
      this.bounds = bounds;
      this.image = image;
      this.map = map;
      // Define a property to hold the image's div. We'll
      // actually create this div upon receipt of the onAdd()
      // method so we'll leave it null for now.
      this.div = null;
      // Explicitly call setMap on this overlay
      this.setMap(map);
    }

    onAdd() {
      const div = document.createElement("div");
      div.style.border = "none";
      div.style.borderWidth = "0px";
      div.style.position = "absolute";

      // Create the img element and attach it to the div.
      const img = document.createElement("img");
      img.src = this.image;
      img.style.width = "100%";
      img.style.height = "100%";
      div.appendChild(img);
      this.div = div;
      // Add the element to the "overlayImage" pane.
      const panes = this.getPanes();
      panes.overlayImage.appendChild(this.div);
    }

    draw() {
      // We use the south-west and north-east
      // coordinates of the overlay to peg it to the correct position and size.
      // To do this, we need to retrieve the projection from the overlay.
      const overlayProjection = this.getProjection();
      // Retrieve the south-west and north-east coordinates of this overlay
      // in LatLngs and convert them to pixel coordinates.
      // We'll use these coordinates to resize the div.
      const sw = overlayProjection.fromLatLngToDivPixel(
        this.bounds.getSouthWest()
      );
      const ne = overlayProjection.fromLatLngToDivPixel(
        this.bounds.getNorthEast()
      );

      // Resize the image's div to fit the indicated dimensions.
      this.div.style.left = `${sw.x}px`;
      this.div.style.top = `${ne.y}px`;
      this.div.style.width = `${ne.x - sw.x}px`;
      this.div.style.height = `${sw.y - ne.y}px`;
    }

    onRemove() {
      this.div.parentNode.removeChild(this.div);
    }
    // Set the visibility to 'hidden' or 'visible'.

    hide() {
      if (this.div) {
        // The visibility property must be a string enclosed in quotes.
        this.div.style.visibility = "hidden";
      }
    }

    show() {
      if (this.div) {
        this.div.style.visibility = "visible";
      }
    }

    toggle() {
      if (this.div) {
        if (this.div.style.visibility === "hidden") {
          this.show();
        } else {
          this.hide();
        }
      }
    }

    // Detach the map from the DOM via toggleDOM().
    // Note that if we later reattach the map, it will be visible again,
    // because the containing <div> is recreated in the overlay's onAdd() method.
  }

  const minMaxLatLng = getMinMaxLatlng(cityShapeLatLng);
  google.maps.event.addListenerOnce(mapObj, "projection_changed", function () {

    const cityShapePointsArr = processCityShapePoints(cityShapeLatLng);
    const processedLatLng = convertLatLngToCartesianCoordinateRadu(cityShapePointsArr, mapObj);

    const zoomedHullPoints = zoomOutCoordinates(processedLatLng);

    const cityShapePixelArr = cityshapePixelArr(zoomedHullPoints);

    const boundedWordCloudImage = generateWordCloudImage(cityShapePixelArr, inputWordsObjArray);

    // center of placing word cloud
    const latAndLon = [62.65232, 30.51232];

    const bounds = new google.maps.LatLngBounds(
      // southWest
      new google.maps.LatLng(minMaxLatLng[0], minMaxLatLng[2]),
      // northEast
      new google.maps.LatLng(minMaxLatLng[1], minMaxLatLng[3])
    );

    // The custom USGSOverlay object contains the USGS image,
    // the bounds of the image, and a reference to the map.
    wordCloud = new WordCloudOverlay(bounds, boundedWordCloudImage);
    const myLatLng = new google.maps.LatLng(latAndLon[0], latAndLon[1]);
    mapObj.fitBounds(bounds);
    mapObj.setCenter(myLatLng);
    wordCloud.setMap(mapObj);
    
    let clickCounter = 0;
    const btn = document.getElementById('btn').addEventListener('click', () => {
      clickCounter = clickCounter + 1;
      clickCounter % 2 === 0 ? wordCloud.setMap(mapObj) : wordCloud.setMap(null);
    });
    
  });


};

function initMap() {
  const map = new google.maps.Map(document.getElementById("map"), {
    zoom: 9,
    center: { lat: 62.65, lng: 30.5 },
    mapTypeId: "terrain",
  });
  // city shape boundary lat&lng obj array
  const joe = JSON.parse('[{"lat":62.250802840354034,"lng":30.789181996283077},{"lat":62.25464353924315,"lng":30.785963365663854},{"lat":62.329609379756164,"lng":30.722965931538578},{"lat":62.32419455620245,"lng":30.688785959054833},{"lat":62.354691990996216,"lng":30.666109185228454},{"lat":62.34870806048718,"lng":30.619957302249563},{"lat":62.35904611767539,"lng":30.61259484618396},{"lat":62.37256643732901,"lng":30.569993388746195},{"lat":62.35681632333845,"lng":30.555569250242222},{"lat":62.35405163447275,"lng":30.513627693440515},{"lat":62.34958096090276,"lng":30.48534071665303},{"lat":62.33718376379868,"lng":30.407135378211144},{"lat":62.35618187610538,"lng":30.376817880116022},{"lat":62.35952789342869,"lng":30.35703720467587},{"lat":62.3601397669799,"lng":30.353417722686284},{"lat":62.364697876924865,"lng":30.326432516806054},{"lat":62.358280764101295,"lng":30.31675450176683},{"lat":62.350004335956996,"lng":30.277005282677017},{"lat":62.41634927607659,"lng":30.240734255827512},{"lat":62.412486328909246,"lng":30.211968835947598},{"lat":62.405082170660364,"lng":30.204490273548174},{"lat":62.401463677314005,"lng":30.20812554172402},{"lat":62.39285301507665,"lng":30.1904412628961},{"lat":62.401717395723786,"lng":30.171568872199806},{"lat":62.39397273620451,"lng":30.161062170879475},{"lat":62.39085238119762,"lng":30.13954671366062},{"lat":62.38819507650135,"lng":30.121245745431377},{"lat":62.39298076405989,"lng":30.100546329005358},{"lat":62.39979128805478,"lng":30.0710547100608},{"lat":62.38820462882498,"lng":30.03847142554826},{"lat":62.38031360925865,"lng":29.97378128979686},{"lat":62.37511496507038,"lng":29.969359073281343},{"lat":62.37025336355459,"lng":29.949640902897627},{"lat":62.367613670343175,"lng":29.945036132692657},{"lat":62.37326627743201,"lng":29.89049335951924},{"lat":62.38282641461631,"lng":29.857796918884635},{"lat":62.39656652001695,"lng":29.84487523656162},{"lat":62.4043665336054,"lng":29.83049539330415},{"lat":62.40743904893362,"lng":29.763220868985794},{"lat":62.458437081828805,"lng":29.762673751570656},{"lat":62.521363687140116,"lng":29.75105337956921},{"lat":62.61115579339492,"lng":29.63832089915492},{"lat":62.63409118366921,"lng":29.637229830835363},{"lat":62.64344299371518,"lng":29.636784588194292},{"lat":62.650183681990846,"lng":29.613092907591003},{"lat":62.65452940127213,"lng":29.637207984010747},{"lat":62.655587028576775,"lng":29.643161057846967},{"lat":62.64793557055074,"lng":29.649692935118622},{"lat":62.64157045983916,"lng":29.666098555312235},{"lat":62.631946076689225,"lng":29.748501876632577},{"lat":62.628146025970395,"lng":29.900650501294432},{"lat":62.601108187151446,"lng":29.927799671435288},{"lat":62.59291485234081,"lng":29.92550970857965},{"lat":62.581317687515764,"lng":29.903155160565177},{"lat":62.57363394770918,"lng":29.908342182755966},{"lat":62.57721937239836,"lng":29.93115588182662},{"lat":62.57546622673659,"lng":29.941334623540588},{"lat":62.56624384684022,"lng":29.943092962876207},{"lat":62.56789483329948,"lng":29.960922390881915},{"lat":62.576950084231896,"lng":29.996060734697394},{"lat":62.58073974538236,"lng":29.99932070544855},{"lat":62.60865973842738,"lng":30.110900184285722},{"lat":62.59988632785741,"lng":30.16402118036515},{"lat":62.59374483840878,"lng":30.20111581527208},{"lat":62.60681926890426,"lng":30.210709879132214},{"lat":62.613098583747046,"lng":30.198927015509973},{"lat":62.62138420786226,"lng":30.210355807020218},{"lat":62.62525315736922,"lng":30.233370930324007},{"lat":62.64080182065035,"lng":30.25711928618496},{"lat":62.629334480958825,"lng":30.280519595992622},{"lat":62.63255845725338,"lng":30.288004869446723},{"lat":62.64102234409186,"lng":30.28003063132377},{"lat":62.65904941201417,"lng":30.284063347816602},{"lat":62.69974953511287,"lng":30.210543080197926},{"lat":62.726063415236055,"lng":30.193002709972394},{"lat":62.725144649654226,"lng":30.182816011510308},{"lat":62.73402160296892,"lng":30.143122234254935},{"lat":62.74928863231218,"lng":30.08987279632595},{"lat":62.779788782036604,"lng":30.03812072634362},{"lat":62.81474596762948,"lng":30.023514426633916},{"lat":62.831720176560786,"lng":30.00504826773459},{"lat":62.88396174046478,"lng":29.948066189221258},{"lat":62.88570754175175,"lng":29.95403388732722},{"lat":62.95175783113514,"lng":29.96829908680566},{"lat":62.99786932961455,"lng":29.962637515163667},{"lat":63.00334924965962,"lng":29.961963627206067},{"lat":63.00552603890439,"lng":29.96169587515675},{"lat":63.019549923978396,"lng":29.95997003577767},{"lat":63.03478819203835,"lng":29.957991371267056},{"lat":63.0457604999834,"lng":29.983645250276318},{"lat":63.0352283871188,"lng":30.00318302366552},{"lat":63.0347875678689,"lng":30.02024828727153},{"lat":63.04664674853005,"lng":30.026645518877796},{"lat":63.047421817072234,"lng":30.04139015852725},{"lat":63.03237675986598,"lng":30.140256137425524},{"lat":63.04437501716605,"lng":30.18260050060655},{"lat":63.0424396601085,"lng":30.239425478999706},{"lat":63.039360136520116,"lng":30.266024382564424},{"lat":63.025715585684864,"lng":30.28590106683833},{"lat":63.01672134730788,"lng":30.326534871628773},{"lat":62.99840243718218,"lng":30.361387406500985},{"lat":62.98113306203499,"lng":30.37219711324266},{"lat":62.94536861735982,"lng":30.43344258191382},{"lat":62.91756290167751,"lng":30.43618256403752},{"lat":62.90313640376961,"lng":30.449353161896628},{"lat":62.90010918650748,"lng":30.464997908189684},{"lat":62.84666511218441,"lng":30.47566304112942},{"lat":62.8451056454061,"lng":30.488140582711075},{"lat":62.83182710108324,"lng":30.50085950572153},{"lat":62.82743889135849,"lng":30.51986449299365},{"lat":62.82897913724328,"lng":30.527100864139275},{"lat":62.81465745921303,"lng":30.52373362565154},{"lat":62.81126307792768,"lng":30.522936072598696},{"lat":62.793812114329185,"lng":30.546197223853028},{"lat":62.76991550395891,"lng":30.55927405543311},{"lat":62.76196358787456,"lng":30.54856333708737},{"lat":62.745862596374465,"lng":30.553863353101914},{"lat":62.7294889487679,"lng":30.54175272669593},{"lat":62.707525386228966,"lng":30.51111637827797},{"lat":62.69138617809156,"lng":30.51812186755043},{"lat":62.68649977315088,"lng":30.5497907130475},{"lat":62.686885191552264,"lng":30.58228901822018},{"lat":62.66359024758358,"lng":30.59310059306097},{"lat":62.63976542112256,"lng":30.669582003909795},{"lat":62.62904238414688,"lng":30.692887635819655},{"lat":62.61780064809835,"lng":30.71410692606303},{"lat":62.59986734845521,"lng":30.6957225272504},{"lat":62.59215339440472,"lng":30.70224227461604},{"lat":62.56677907171576,"lng":30.75196199232307},{"lat":62.5608122526738,"lng":30.755386473659048},{"lat":62.55556350841425,"lng":30.776429148030072},{"lat":62.54708995345111,"lng":30.81035823610809},{"lat":62.55453767914775,"lng":30.841063038962627},{"lat":62.5441296313765,"lng":30.863465972096485},{"lat":62.53642720082718,"lng":30.864584890674273},{"lat":62.525544591931784,"lng":30.866164918535915},{"lat":62.51438961224036,"lng":30.878933773899774},{"lat":62.478122536365674,"lng":30.920373936194064},{"lat":62.488211748012795,"lng":30.93741817395602},{"lat":62.45922688938857,"lng":31.000474322813076},{"lat":62.453975031081946,"lng":31.000572780040237},{"lat":62.44934733799476,"lng":30.992072203477345},{"lat":62.44934910648882,"lng":30.98369105669951},{"lat":62.44953284377055,"lng":30.976042030830033},{"lat":62.447727947554185,"lng":30.959541274562447},{"lat":62.445376163722045,"lng":30.938070597143575},{"lat":62.413046891506816,"lng":30.936570814305174},{"lat":62.384950972974885,"lng":30.95545921706673},{"lat":62.4003064311484,"lng":31.02230784796023},{"lat":62.41449678366403,"lng":31.084271505736165},{"lat":62.41661166607041,"lng":31.09352183956897},{"lat":62.40627667174635,"lng":31.074769565240643},{"lat":62.33323406471962,"lng":30.942742215652668},{"lat":62.332617662574805,"lng":30.944937797016394},{"lat":62.33104946533304,"lng":30.950522656201798},{"lat":62.33094171846371,"lng":30.950906325204954},{"lat":62.330180940491914,"lng":30.953615162242667},{"lat":62.32836915234818,"lng":30.96006493942458},{"lat":62.327763746473295,"lng":30.96221971311068},{"lat":62.31231213964094,"lng":30.955014616888548},{"lat":62.305626134405784,"lng":30.943312213140103},{"lat":62.307877348170976,"lng":30.924871149767128},{"lat":62.31039018949024,"lng":30.90426004851991},{"lat":62.27550617203709,"lng":30.8341085918154},{"lat":62.27066873801887,"lng":30.810813452189358},{"lat":62.26101469424046,"lng":30.808692965608728},{"lat":62.250802840354034,"lng":30.789181996283077}]');

  const poly = new google.maps.Polygon({
    path: joe,
    geodesic: true,
    strokeColor: "#FF0000",
    strokeOpacity: 1.0,
    strokeWeight: 2,
  });
  poly.setMap(map);

  // map should be initlized before pass to initWordCloud
  initWordCloud(map, joe, inputWordList);
}
