using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using TMPro;

public class Score : MonoBehaviour
{
    public static int score;
    private TextMeshProUGUI scoreText;

    void Start()
    {
        scoreText = GetComponent<TextMeshProUGUI>();
    }

    void Update()
    {
        scoreText.text = "Score:" + score.ToString();
    }
}
