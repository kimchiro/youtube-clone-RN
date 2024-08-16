import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, Animated, Dimensions, SafeAreaView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import Icon from "react-native-vector-icons/MaterialIcons"
import queryString from "query-string"
import WebView, { WebViewMessageEvent } from "react-native-webview"

const YT_WIDTH = Dimensions.get('window').width;
const YT_HEIGHT = YT_WIDTH * (9 / 16);

enum PlayerState {
  UNSTARTED = -1,
  ENDED = 0,
  PLAYING = 1,
  PAUSED = 2,
  BUFFERING = 3,
  CUED = 5
}


const styles = StyleSheet.create({
  safearea: { flex: 1, backgroundColor: '#242424'},
  input: { 
    fontSize: 15,
    color: "AEAEB2",
    paddingVertical: 0, 
    flex: 1,
    marginRight: 4,
  },
  inputContainer: { 
    backgroundColor: '#1A1A1A',
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginHorizontal: 16,
    marginVertical: 16,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  youTubeContainer: {
    width: YT_WIDTH,
    height: YT_HEIGHT,
    backgroundColor: '#4A4A4A',
  },
  controllor: {
    backgroundColor: '#1A1A1A',
    borderRadius: 10,
    marginHorizontal: 16,
    marginTop: 20,
    paddingVertical: 10,
    paddingHorizontal: 72,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  playButton: {
    height: 50,
    width: 50,
    alignItems: 'center',
    justifyContent: 'center'
  },
  timeText: {
    color: '#AEAEB2',
    alignSelf: 'flex-end',
    marginTop: 15,
    marginRight: 20,
    fontSize: 13,
  },
  seekBarBackground: {
    height: 3,
    backgroundColor: '#D4D4D4'
  },
  seekBarProgress: {
    height: 3,
    backgroundColor: '#00DDA8',
    width: '0%',
  }
});

const formatTime = (seconds: number) => {
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = Math.floor(seconds % 60)

  const formattedMinutes = String(minutes).padStart(2, '0')
  const formattedSeconds = String(remainingSeconds).padStart(2, '0')

  return `${formattedMinutes}:${formattedSeconds}`
}

const App = () => {
  const webViewRef = useRef<WebView | null>(null);
  const seekBarAnimRef = useRef(new Animated.Value(0));
  const [url, setUrl] = useState("")
  const [youTubeId, setYouTubeId] = useState("833WFf1Lpsc") // 실제 비디오 ID로 변경
  const [playing, setPlaying] = useState(false)
  const [durationInSec, setDurationInSec] = useState(0)
  const [currentTime, setCurrentTime] = useState(0);

  const onPressOpenLink = useCallback(() => {
    const {query: {v: id}} = queryString.parseUrl(url)
    console.log('id', id)
    if(typeof id === 'string') { 
      setYouTubeId(id)
    } else {
      Alert.alert('잘못된 URL 양식입니다.')
    }
  }, [url])

  const source = useMemo(() => {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1">
        </head>
        <body style="margin: 0; padding: 0">
          <div id="player"></div>
          <script src="https://www.youtube.com/iframe_api"></script>
          <script>
            var player;
            function onYouTubeIframeAPIReady() {
              player = new YT.Player('player', {
                height: '${YT_HEIGHT}',
                width: '${YT_WIDTH}',
                videoId: '${youTubeId}',
                events: {
                  'onReady': onPlayerReady,
                  'onStateChange': onPlayerStateChange
                }
              });
            }

            function postMessageToRN(type, data) {
              window.ReactNativeWebView.postMessage(JSON.stringify({type, data}));
            }

            function onPlayerReady(event) {
              postMessageToRN('duration', player.getDuration());
              postMessageToRN('playerReady', true);
              setInterval(() => {
                postMessageToRN('currentTime', player.getCurrentTime());
              }, 1000);
            }

            function onPlayerStateChange(event) {
              postMessageToRN('stateChange', event.data);
            }
              
            function playVideo() {
              player.playVideo();
            }
            function pauseVideo() {
              player.pauseVideo();
            }
          </script>
        </body>
      </html>
    `;
    return { html };
  }, [youTubeId]);

  const onPressPlay = useCallback(() => {
    webViewRef.current?.injectJavaScript('playVideo(); true;');
  }, []);

  const onPressPause = useCallback(() => {
    webViewRef.current?.injectJavaScript('pauseVideo(); true;');
  }, []);

  const handleWebViewMessage = useCallback((event: WebViewMessageEvent) => {
    const { type, data } = JSON.parse(event.nativeEvent.data);
    switch (type) {
      case 'stateChange':
        setPlaying(data === PlayerState.PLAYING);
        break;
      case 'duration':
        setDurationInSec(data);
        break;
      case 'currentTime':
        setCurrentTime(data);
        break;
      case 'playerReady':
        console.log('YouTube player is ready');
        break;
    }
  }, []);

  //영상 현재 시청 시간
  const durationText = useMemo(() => formatTime(durationInSec), [durationInSec])
  const currentTimeText = useMemo(() => formatTime(currentTime), [currentTime])


  // 애니메이션 데이터 연결
  useEffect(()=> {
    Animated.timing(seekBarAnimRef.current, {
      toValue: currentTime,
      duration: 50,
      useNativeDriver: false
    }).start()
  }, [currentTime])

  return (
    <SafeAreaView style={styles.safearea}>
      <View style={styles.inputContainer}>
        <TextInput 
          style={styles.input}
          placeholder="클릭하여 링크를 삽입하세요"
          placeholderTextColor="#AEAEB2"
          onChangeText={setUrl}
          value={url}
          inputMode="url"
        />
        <TouchableOpacity 
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          onPress={onPressOpenLink}
        >
          <Icon 
            name="add-link"
            color='#AEAEB2'
            size={24}
          />
        </TouchableOpacity>
      </View>
      <View style={styles.youTubeContainer}>
        {youTubeId.length > 0 && (
          <WebView 
            ref={webViewRef}
            source={source}
            scrollEnabled={false}
            allowsInlineMediaPlayback
            mediaPlaybackRequiresUserAction={false}
            onMessage={handleWebViewMessage}
          /> 
        )}
      </View>
      <View style={styles.seekBarBackground}>
        <Animated.View style={[styles.seekBarProgress, {
          width: seekBarAnimRef.current.interpolate({
            inputRange: [0, durationInSec],
            outputRange: ['0%', '100%']
          })
        }]}/>
      </View>
      <Text style={styles.timeText}>{`${currentTimeText} / ${durationText}`}</Text>
      <View style={styles.controllor}>
        {playing ? (
          <TouchableOpacity style={styles.playButton} onPress={onPressPause}>
            <Icon name="pause-circle" size={41.67} color="#E5E5EA" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.playButton} onPress={onPressPlay}>
            <Icon name="play-circle" size={39.58} color="#00DDA8" />
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  )
}

export default App;